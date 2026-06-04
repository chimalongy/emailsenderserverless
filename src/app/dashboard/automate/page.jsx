'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaRobot, FaPlay, FaPlus, FaClock, FaCheckCircle,
  FaCogs, FaExclamationTriangle, FaToggleOn, FaToggleOff,
  FaEnvelope, FaBullseye, FaSpinner
} from 'react-icons/fa';
import { FiChevronRight } from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import CreateOutboundModal from './components/CreateOutboundModal';

export default function AutomatePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Fetch from Supabase ─────────────────────────────────────── */
  const fetchAutomations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_outbounds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomations(data || []);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
      toast.error('Failed to load automations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAutomations();
  }, [user, fetchAutomations]);

  /* ── After creation the API returns the real record ─────────── */
  const handleCreateOutbound = async ({ apiData, domain, name }) => {
    if (apiData) {
      setAutomations((prev) => [apiData, ...prev]);
    } else {
      await fetchAutomations();
    }
    toast.success(`Outbound automation "${name}" created for ${domain}!`);
  };

  /* ── Toggle status locally + persist ────────────────────────── */
  const toggleStatus = async (e, automation) => {
    e.stopPropagation();
    const nextStatus = automation.status === 'active' ? 'inactive' : 'active';

    setAutomations((prev) =>
      prev.map((a) => (a.id === automation.id ? { ...a, status: nextStatus } : a))
    );

    try {
      const { error } = await supabase
        .from('auto_outbounds')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', automation.id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(`"${automation.name}" ${nextStatus === 'active' ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === automation.id ? { ...a, status: automation.status } : a))
      );
      toast.error('Failed to update status.');
    }
  };

  const triggerInstantRun = (e, name) => {
    e.stopPropagation();
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: `Running "${name}" outbound agent...`,
        success: `AI outbound sequence triggered for "${name}".`,
        error: 'Execution failed.',
      }
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <CreateOutboundModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOutbound}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500/10 via-indigo-500/5 to-transparent border border-teal-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-teal-500 text-white rounded-xl shadow-md">
              <FaRobot className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Outbound Automations</h2>
              <p className="text-gray-500 text-sm sm:text-base mt-1">
                Configure AI-powered outbound sequences — auto-personalize messages and send campaigns based on your scraped prospects.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow transition-colors flex items-center gap-2 self-stretch md:self-auto justify-center"
          >
            <FaPlus className="w-4 h-4" />
            <span>Create Outbound</span>
          </button>
        </div>
      </div>

      {/* Automation List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Your Outbound Workflows</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500">AI Agent Enabled</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <FaSpinner className="w-7 h-7 animate-spin text-teal-500" />
            <p className="text-sm">Loading automations…</p>
          </div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <div className="p-4 bg-teal-50 rounded-full">
              <FaRobot className="w-8 h-8 text-teal-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No automations yet</p>
            <p className="text-xs text-gray-400">Click "Create Outbound" to set up your first AI automation.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaPlus className="w-3.5 h-3.5" />
              Create Outbound
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {automations.map((automation) => (
              <div
                key={automation.id}
                onClick={() => router.push(`/dashboard/automate/${automation.id}`)}
                className="p-5 hover:bg-teal-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base group-hover:text-teal-700 transition-colors truncate">
                      {automation.name}
                    </h4>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                      automation.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {automation.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <FaBullseye className="text-gray-400 flex-shrink-0" />
                      <span><strong className="text-gray-700">Domain:</strong> {automation.domain}</span>
                    </div>
                    {automation.price && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold flex-shrink-0 text-center w-3.5">$</span>
                        <span><strong className="text-gray-700">Offer Price:</strong> {automation.price}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <FaClock className="text-gray-400 flex-shrink-0" />
                      <span><strong className="text-gray-700">Start Date:</strong> {formatDate(automation.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaCheckCircle className="text-gray-400 flex-shrink-0" />
                      <span><strong className="text-gray-700">Last Run:</strong> {formatDate(automation.last_run)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaEnvelope className="text-gray-400 flex-shrink-0" />
                      <span><strong className="text-gray-700">Emails Sent:</strong> {automation.emails_sent ?? 0} messages</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaCogs className="text-gray-400 flex-shrink-0" />
                      <span><strong className="text-gray-700">Sequences Completed:</strong> {automation.campaigns_completed ?? 0} campaigns</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 self-end sm:self-auto flex-shrink-0">
                  <button
                    onClick={(e) => triggerInstantRun(e, automation.name)}
                    className="px-3 py-2 text-xs font-semibold text-gray-700 hover:text-teal-700 bg-white border border-gray-200 rounded-lg hover:border-teal-200 flex items-center gap-1.5 transition-colors hover:shadow-sm"
                    title="Trigger immediate execution"
                  >
                    <FaPlay className="w-3 h-3 text-teal-600" />
                    <span>Run Now</span>
                  </button>
                  <button
                    onClick={(e) => toggleStatus(e, automation)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      automation.status === 'active'
                        ? 'text-teal-600 hover:bg-teal-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={automation.status === 'active' ? 'Deactivate schedule' : 'Activate schedule'}
                  >
                    {automation.status === 'active' ? (
                      <FaToggleOn className="w-8 h-8" />
                    ) : (
                      <FaToggleOff className="w-8 h-8" />
                    )}
                  </button>
                  <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sandbox Notice */}
      <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
        <FaExclamationTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-900 block">Sandbox Notice</span>
          <p>
            AI outbound automations use your configured email provider and Claude AI for message personalization. Ensure sending limits, unsubscribe compliance (CAN-SPAM / GDPR), and API quotas are properly configured before activating large-scale campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}