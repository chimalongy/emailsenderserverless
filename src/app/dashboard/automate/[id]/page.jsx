'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthProvider';
import { supabase } from '../../../lib/supabase';
import {
  FiArrowLeft, FiRefreshCw, FiAlertCircle,
  FiMail, FiToggleLeft, FiToggleRight,
  FiGlobe, FiCheckCircle, FiBarChart2, FiZap,
  FiCheck, FiX
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

/* ─── Tiny helpers ─────────────────────────────────────────────── */
const getUniqueEmailCount = (emails) => {
  if (!emails || !Array.isArray(emails)) return 0;
  const set = new Set();
  emails.forEach(item => {
    if (item && item.emails && Array.isArray(item.emails)) {
      item.emails.forEach(e => {
        if (e) set.add(e.trim().toLowerCase());
      });
    }
  });
  return set.size;
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-80 space-y-3 p-4">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
    <p className="text-gray-500 text-sm">Loading automation details…</p>
  </div>
);

const ErrorState = ({ error, onBack }) => (
  <div className="space-y-4 p-4">
    <button
      onClick={onBack}
      className="flex items-center text-sm text-teal-600 hover:text-teal-700 transition-colors group"
    >
      <FiArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      Back to Automations
    </button>
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <FiAlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-800 font-semibold text-sm">Failed to load automation</p>
        <p className="text-red-700 text-xs mt-1">{error}</p>
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    paused: { label: 'Paused', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  };
  const { label, cls } = map[status] || map.inactive;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color = 'teal' }) => {
  const colors = {
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0">
      <div className={`p-2 rounded-lg border flex-shrink-0 self-start sm:self-auto ${colors[color]}`}>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-base sm:text-xl font-bold text-gray-900 truncate leading-tight">{value}</p>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">{label}</p>
      </div>
    </div>
  );
};

/* ─── Pipeline Step ─────────────────────────────────────────────── */
const PipelineStep = ({ stepNumber, icon: Icon, title, description, status, statusContent, badge, actionButton, isLast }) => {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isFailed = status === 'failed';
  const isPending = status === 'pending';

  return (
    <div className={`px-4 sm:px-6 py-5 flex items-start gap-3 sm:gap-4 transition-colors ${isActive ? 'bg-teal-50/40' : 'hover:bg-gray-50/60'}`}>
      {/* Step indicator */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0
          ${isCompleted ? 'bg-emerald-500 text-white' :
            isFailed ? 'bg-red-500 text-white' :
              isActive ? 'bg-white border-2 border-teal-500 text-teal-600' :
                'bg-gray-100 text-gray-500 border border-gray-200'}`
        }>
          {isCompleted ? <FiCheck className="h-4 w-4" /> :
            isFailed ? <FiX className="h-4 w-4" /> :
              isActive ? <FiRefreshCw className="h-4 w-4 animate-spin" /> :
                stepNumber}
        </div>
        {!isLast && (
          <div className={`w-px flex-1 mt-2 ${isCompleted ? 'bg-emerald-200' : 'bg-gray-200'}`} style={{ minHeight: '1.5rem' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-teal-600 flex-shrink-0" />
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 animate-pulse border border-teal-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-2">{description}</p>
        <div className="text-xs">{statusContent}</div>
      </div>

      {/* Action button */}
      {actionButton && (
        <div className="flex-shrink-0 self-center ml-1">
          {actionButton}
        </div>
      )}
    </div>
  );
};

/* ─── Main page ─────────────────────────────────────────────────── */
export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const automationId = params?.id;

  const [automation, setAutomation] = useState(null);
  const [scrape, setScrape] = useState(null);
  const [outbound, setOutbound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);

  const fetchAutomation = useCallback(async () => {
    if (!user || !automationId) return;
    setRefreshing(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('auto_outbounds')
        .select('*')
        .eq('id', automationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Automation not found or you do not have access to it.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setAutomation(data);

      if (data.scrape_id) {
        const { data: scrapeData, error: scrapeError } = await supabase
          .from('scrappings')
          .select('id, name, status, emails')
          .eq('id', data.scrape_id)
          .maybeSingle();
        if (!scrapeError) setScrape(scrapeData);
        else console.error('Error fetching scrape:', scrapeError);
      } else {
        setScrape(null);
      }

      const { data: outboundData, error: outboundError } = await supabase
        .from('outbounds')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('name', data.name)
        .maybeSingle();

      if (!outboundError) setOutbound(outboundData);
      else console.error('Error fetching outbound:', outboundError);

    } catch (err) {
      console.error('Error loading automation:', err);
      setError(err.message || 'Failed to load automation details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, automationId]);

  useEffect(() => {
    if (user && automationId) fetchAutomation();
  }, [user, automationId, fetchAutomation]);

  useEffect(() => {
    let intervalId = null;
    const isPipelineActive = !outbound && !(scrape && scrape.status === 'failed');
    if (isPipelineActive && user && automationId) {
      intervalId = setInterval(() => fetchAutomation(), 5000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [scrape, outbound, user, automationId, fetchAutomation]);

  const handleToggleStatus = async () => {
    if (!automation || toggling) return;
    const nextStatus = automation.status === 'active' ? 'inactive' : 'active';
    setToggling(true);
    try {
      const { error: updateError } = await supabase
        .from('auto_outbounds')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', automation.id)
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      setAutomation((prev) => ({ ...prev, status: nextStatus }));
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} onBack={() => router.push('/dashboard/automate')} />;
  if (!automation) return null;

  const isScraping = !scrape || ['pending', 'running', 'processing'].includes(scrape.status);
  const isScrapeCompleted = scrape && scrape.status === 'completed';
  const isScrapeFailed = scrape && scrape.status === 'failed';
  const isPlanning = isScrapeCompleted && !outbound;
  const isOutboundCreated = !!outbound;
  const isActive = automation.status === 'active';

  // Step statuses
  const step1Status = isScrapeCompleted ? 'completed' : isScrapeFailed ? 'failed' : 'active';
  const step2Status = isOutboundCreated ? 'completed' : isPlanning ? 'active' : 'pending';
  const step3Status = isOutboundCreated ? 'completed' : 'pending';

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto px-1 sm:px-0">

      {/* Top nav */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/dashboard/automate')}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <FiArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden xs:inline">Back to Automations</span>
          <span className="xs:hidden">Back</span>
        </button>

        <button
          onClick={fetchAutomation}
          disabled={refreshing}
          title="Refresh"
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Hero card — flat, no gradient */}
      <div className="bg-teal-600 rounded-2xl p-5 sm:p-6 shadow-sm text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Identity */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
              <FaRobot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight truncate">{automation.name}</h1>
              <div className="mt-1.5">
                <StatusBadge status={automation.status} />
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex-shrink-0 ${isActive
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                : 'bg-white text-teal-700 hover:bg-teal-50 shadow-sm'
              }`}
          >
            {toggling ? (
              <FiRefreshCw className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <FiToggleRight className="h-5 w-5" />
            ) : (
              <FiToggleLeft className="h-5 w-5" />
            )}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Stats — 3 cards (removed Sequences) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={FiMail} label="Emails Sent" value={automation.emails_sent ?? 0} color="teal" />
        <StatCard icon={FiCheckCircle} label="Completed" value={automation.campaigns_completed ?? 0} color="emerald" />
        <StatCard icon={FiZap} label="Status" value={automation.status ?? '—'} color="sky" />
      </div>

      {/* Pipeline Steps */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiZap className="h-4 w-4 text-teal-600" />
          <h2 className="font-bold text-gray-800 text-sm">Automation Pipeline</h2>
        </div>

        <div className="divide-y divide-gray-100">

          {/* Step 1 — Find Emails */}
          <PipelineStep
            stepNumber={1}
            icon={FiMail}
            title="Find Emails"
            description="Discover and validate prospect email addresses from your target domain or lead list."
            status={step1Status}
            badge={isScraping ? 'Scraping Active' : null}
            statusContent={
              isScrapeCompleted ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <FiCheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Discovery completed — found <strong className="ml-1">{getUniqueEmailCount(scrape.emails)}</strong>&nbsp;unique emails.
                </span>
              ) : isScraping ? (
                <div className="space-y-1.5">
                  <span className="text-teal-600 font-semibold flex items-center gap-1.5">
                    <FiRefreshCw className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    Running Google Maps Scraper &amp; crawler…
                  </span>
                  <div className="w-40 h-1.5 bg-teal-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 animate-pulse w-full rounded-full" />
                  </div>
                </div>
              ) : isScrapeFailed ? (
                <span className="text-red-600 font-semibold flex items-center gap-1.5">
                  <FiAlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Scraping failed. Check configuration.
                </span>
              ) : (
                <span className="text-gray-400">Not started yet.</span>
              )
            }
            actionButton={scrape && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors border border-teal-200"
                onClick={() => router.push(`/dashboard/scrape-emails/${scrape.id}`)}
              >
                <FiGlobe className="h-3 w-3" />
                <span className="hidden sm:inline">View Scrape</span>
                <span className="sm:hidden">View</span>
              </button>
            )}
          />

          {/* Step 2 — Plan Outbound */}
          <PipelineStep
            stepNumber={2}
            icon={FiBarChart2}
            title="Plan Outbound"
            description="AI generates a sequenced outreach strategy — timing, tone, and messaging tailored to each prospect."
            status={step2Status}
            badge={isPlanning ? 'Planning Active' : null}
            statusContent={
              isOutboundCreated ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <FiCheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Outreach sequence and template generation complete.
                </span>
              ) : isPlanning ? (
                <div className="space-y-1.5">
                  <span className="text-teal-600 font-semibold flex items-center gap-1.5">
                    <FiRefreshCw className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    Analysing prospects and writing copy drafts…
                  </span>
                  <div className="w-40 h-1.5 bg-teal-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 animate-pulse w-full rounded-full" />
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">Waiting for email discovery to complete…</span>
              )
            }
          />

          {/* Step 3 — Create Outbound */}
          <PipelineStep
            stepNumber={3}
            icon={FiCheckCircle}
            title="Create Outbound"
            description="Automatically drafts and queues personalised outbound emails ready for sending via your domain."
            status={step3Status}
            isLast
            statusContent={
              isOutboundCreated ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5 flex-wrap">
                  <FiCheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Campaign created:&nbsp;<strong>{outbound.name}</strong>&nbsp;
                  <span className="text-gray-500 font-normal">({outbound.status})</span>
                </span>
              ) : (
                <span className="text-gray-400">Waiting for AI planner to publish campaign…</span>
              )
            }
            actionButton={isOutboundCreated && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                onClick={() => router.push(`/dashboard/outbounds/${outbound.id}`)}
              >
                <FiMail className="h-3 w-3" />
                <span className="hidden sm:inline">Open Campaign</span>
                <span className="sm:hidden">Open</span>
              </button>
            )}
          />

        </div>
      </div>

    </div>
  );
}
