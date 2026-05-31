'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthProvider';
import { supabase } from '../../../lib/supabase';
import {
  FiArrowLeft, FiRefreshCw, FiEdit2, FiAlertCircle,
  FiCalendar, FiMail, FiClock, FiToggleLeft, FiToggleRight,
  FiPlay, FiGlobe, FiCheckCircle, FiBarChart2, FiZap
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';

/* ─── Tiny helpers ─────────────────────────────────────────────── */
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
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg border ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
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

  const isActive = automation.status === 'active';

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Top nav bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/dashboard/automate')}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <FiArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Automations
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAutomation}
            disabled={refreshing}
            title="Refresh"
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl flex-shrink-0">
              <FaRobot className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{automation.name}</h1>
              <p className="text-teal-100 text-sm mt-1">
                AI-powered outbound automation
              </p>
              <div className="mt-2">
                <StatusBadge status={automation.status} />
              </div>
            </div>
          </div>

          {/* Toggle active/inactive */}
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${isActive
                ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                : 'bg-white text-teal-700 hover:bg-teal-50 shadow'
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FiMail} label="Emails Sent" value={automation.emails_sent ?? 0} color="teal" />
        <StatCard icon={FiCheckCircle} label="Campaigns Completed" value={automation.campaigns_completed ?? 0} color="emerald" />
        <StatCard icon={FiZap} label="Status" value={automation.status ?? '—'} color="sky" />
        <StatCard icon={FiBarChart2} label="Sequences" value="AI-powered" color="violet" />
      </div>

      {/* Pipeline Steps */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiZap className="h-4 w-4 text-teal-600" />
          <h2 className="font-bold text-gray-800 text-sm">Automation Pipeline</h2>
        </div>

        <div className="divide-y divide-gray-100">

          {/* Step 1 — Find Emails */}
          <div className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                1
              </div>
              <div className="w-px bg-gray-200 flex-1 mt-1" style={{ minHeight: '1.75rem' }} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <FiMail className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <p className="text-sm font-bold text-gray-900">Find Emails</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Discover and validate prospect email addresses from your target domain or lead list.
              </p>
            </div>
            <button
              className="self-center flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors border border-teal-200"
              onClick={() => alert('Find Emails — wire to your API')}
            >
              <FiPlay className="h-3 w-3" />
              Run
            </button>
          </div>

          {/* Step 2 — Plan Outbound */}
          <div className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                2
              </div>
              <div className="w-px bg-gray-200 flex-1 mt-1" style={{ minHeight: '1.75rem' }} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <FiBarChart2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <p className="text-sm font-bold text-gray-900">Plan Outbound</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                AI generates a sequenced outreach strategy — timing, tone, and messaging tailored to each prospect.
              </p>
            </div>
            <button
              className="self-center flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors border border-teal-200"
              onClick={() => alert('Plan Outbound — wire to your API')}
            >
              <FiPlay className="h-3 w-3" />
              Run
            </button>
          </div>

          {/* Step 3 — Create Outbound */}
          <div className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                3
              </div>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <p className="text-sm font-bold text-gray-900">Create Outbound</p>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Automatically drafts and queues personalised outbound emails ready for sending via your domain.
              </p>
            </div>
            <button
              className="self-center flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors border border-teal-200"
              onClick={() => alert('Create Outbound — wire to your API')}
            >
              <FiPlay className="h-3 w-3" />
              Run
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}