"use client";

import { useState, useEffect } from 'react';
import React from 'react';
import { 
  FaClock, 
  FaPaperPlane, 
  FaExclamationCircle,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaEnvelope
} from 'react-icons/fa';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

export default function TaskDetailsModal({ onClose, task, allocations, onRefresh }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedSender, setSelectedSender] = useState(null);
  const [emailsData, setEmailsData] = useState({});
  const [loadingEmails, setLoadingEmails] = useState({});
  const [sendingEmails, setSendingEmails] = useState(new Set());

  const statusColors = {
    completed: "bg-emerald-500",
    failed: "bg-rose-500",
    pending: "bg-amber-500",
    in_progress: "bg-blue-500",
  };

  // Fetch emails when accordion is opened
  useEffect(() => {
    if (expandedSection && expandedSection.includes('::')) {
      const [accountId, section] = expandedSection.split('::');
      fetchEmailsForAccount(accountId, section);
    }
  }, [expandedSection, task?.id]);

  const fetchEmailsForAccount = async (accountId, status) => {
    if (!task?.id || !accountId) return;

    const key = `${accountId}::${status}`;
    setLoadingEmails(prev => ({ ...prev, [key]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch('/api/tasks/get-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          task_id: task.id,
          account_id: accountId,
          status: status === 'scheduled' ? 'scheduled' : status === 'sent' ? 'sent' : 'failed'
        })
      });

      const result = await response.json();

      if (result.success) {
        setEmailsData(prev => ({
          ...prev,
          [key]: result.emails || []
        }));
      } else {
        toast.error(result.error || 'Failed to fetch emails');
        setEmailsData(prev => ({
          ...prev,
          [key]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to fetch emails');
      setEmailsData(prev => ({
        ...prev,
        [key]: []
      }));
    } finally {
      setLoadingEmails(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleAccordion = (section, senderId = null) => {
    // Use :: as delimiter since UUIDs contain hyphens
    const key = senderId ? `${senderId}::${section}` : section;
    setExpandedSection(expandedSection === key ? null : key);
    if (senderId) {
      setSelectedSender(senderId);
    }
  };

  const handleSendNow = async (emailId, recipient) => {
    if (sendingEmails.has(emailId)) return;

    setSendingEmails(prev => new Set(prev).add(emailId));
    const toastId = toast.loading(`Sending email to ${recipient}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again', { id: toastId });
        return;
      }

      const response = await fetch('/api/tasks/send-email-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email_id: emailId })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Email sent successfully to ${recipient}`, { id: toastId });
        
        // Refresh emails for the current section
        if (expandedSection && expandedSection.includes('::')) {
          const [accountId, section] = expandedSection.split('::');
          await fetchEmailsForAccount(accountId, section);
        }

        // Call onRefresh if provided to update parent component
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(result.error || 'Failed to send email', { id: toastId });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email', { id: toastId });
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
    }
  };

  const handleResend = async (emailId, recipient) => {
    // Resend is the same as send now for failed emails
    await handleSendNow(emailId, recipient);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper to extract section from expandedSection key
  const getSectionFromKey = (key, accountId) => {
    if (!key || !accountId) return null;
    const prefix = `${accountId}::`;
    if (key.startsWith(prefix)) {
      return key.replace(prefix, '');
    }
    return key;
  };

  const renderEmailList = (emails, type, accountId) => {
    const key = `${accountId}-${type}`;
    const isLoading = loadingEmails[key];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <FaSpinner className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Loading emails...</span>
        </div>
      );
    }

    if (!emails || emails.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          No {type} emails found
        </div>
      );
    }

    if (type === 'scheduled') {
      return emails.map(email => {
        const isSending = sendingEmails.has(email.id);
        return (
          <div key={email.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{email.recipient}</div>
              {email.subject && (
                <div className="text-xs text-gray-500 mt-0.5">{email.subject}</div>
              )}
              <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                Scheduled for {formatTime(email.scheduled_at)}
              </div>
            </div>
            <button
              onClick={() => handleSendNow(email.id, email.recipient)}
              disabled={isSending}
              className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-3 h-3" />
                  Send Now
                </>
              )}
            </button>
          </div>
        );
      });
    } else if (type === 'sent') {
      return emails.map(email => (
        <div key={email.id} className="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
          <div className="font-medium text-gray-900">{email.recipient}</div>
          {email.subject && (
            <div className="text-xs text-gray-500 mt-0.5">{email.subject}</div>
          )}
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <FaCheckCircle className="w-3 h-3" />
            Sent at {formatTime(email.sent_at)}
          </div>
        </div>
      ));
    } else if (type === 'failed') {
      return emails.map(email => {
        const isSending = sendingEmails.has(email.id);
        return (
          <div key={email.id} className="flex items-start justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{email.recipient}</div>
              {email.subject && (
                <div className="text-xs text-gray-500 mt-0.5">{email.subject}</div>
              )}
              <div className="text-xs text-rose-600 mt-1 flex items-start gap-1">
                <FaExclamationCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{email.error_message || 'Unknown error occurred'}</span>
              </div>
            </div>
            <button
              onClick={() => handleResend(email.id, email.recipient)}
              disabled={isSending}
              className="ml-4 px-3 py-1.5 bg-rose-100 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-3 h-3" />
                  Resend
                </>
              )}
            </button>
          </div>
        );
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-8 rounded-full ${
                statusColors[task.status] || "bg-gray-400"
              }`}
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md flex items-center gap-1">
                  <FaEnvelope className="w-3 h-3" />
                  {task.type}
                </span>
                <span>•</span>
                <span>Task ID: {task.id?.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Desktop: Task Overview Grid */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {task.status === "completed" ? (
                      <FaCheckCircle className="w-5 h-5 text-blue-600" />
                    ) : task.status === "failed" ? (
                      <FaTimesCircle className="w-5 h-5 text-rose-600" />
                    ) : task.status === "pending" ? (
                      <FaClock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <FaSpinner className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Status
                  </span>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${
                    task.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : task.status === "failed"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaCalendarAlt className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Scheduled Time
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {task.scheduled_at ? (
                    new Date(task.scheduled_at).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <span className="text-gray-400">Not scheduled</span>
                  )}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaUser className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    Senders
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {allocations.length}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    sender{allocations.length !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            </div>

            {/* Mobile: Single Block Layout */}
            <div className="md:hidden bg-gradient-to-br from-gray-50 to-white rounded-xl p-2 border border-gray-200">
              <div className="space-y-4">
                {/* Status Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {task.status === "completed" ? (
                        <FaCheckCircle className="w-5 h-5 text-blue-600" />
                      ) : task.status === "failed" ? (
                        <FaTimesCircle className="w-5 h-5 text-rose-600" />
                      ) : task.status === "pending" ? (
                        <FaClock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <FaSpinner className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Status
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold capitalize mt-1 inline-block ${
                          task.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : task.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200"></div>

                {/* Scheduled Time Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FaCalendarAlt className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Scheduled Time
                      </div>
                      <div className="text-base font-semibold text-gray-900 mt-1">
                        {task.scheduled_at ? (
                          new Date(task.scheduled_at).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span className="text-gray-400">Not scheduled</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200"></div>

                {/* Senders Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FaUser className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">
                        Senders
                      </div>
                      <div className="text-base font-semibold text-gray-900 mt-1">
                        {allocations.length}{" "}
                        <span className="text-sm font-normal text-gray-600">
                          sender{allocations.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocations Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Allocation Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Distribution across sender accounts
                </p>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FaUser className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    No allocations found
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    This task hasn't been allocated to any senders yet
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <FaUser className="w-3 h-3" />
                                <span>Sender</span>
                              </div>
                            </th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <FaEnvelope className="w-3 h-3" />
                                <span>Account</span>
                              </div>
                            </th>
                            <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Status Breakdown
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allocations.map((a, index) => (
                            <React.Fragment key={a.account_id}>
                              <tr
                                key={a.account_id}
                                className="hover:bg-gray-50/50 transition-colors duration-150"
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                      <FaUser className="text-sm text-blue-700" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 truncate">
                                        {a.sender_name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        #{String(index + 1).padStart(2, "0")}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 max-w-[200px]">
                                  <div className="text-gray-600 truncate">
                                    {a.email}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex justify-center">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                      <span className="text-sm font-bold text-white">
                                        {a.total}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="space-y-2">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                        style={{
                                          width: `${(a.sent / a.total) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <button
                                        onClick={() => toggleAccordion('scheduled', a.account_id)}
                                        className="bg-blue-50 hover:bg-blue-100 p-3 rounded-lg text-center transition-colors duration-150 flex flex-col items-center justify-center gap-1"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FaClock className="w-4 h-4 text-blue-600" />
                                          <span className="font-semibold text-blue-700">
                                            {a.scheduled}
                                          </span>
                                        </div>
                                        <div className="text-xs text-blue-600">
                                          Scheduled
                                        </div>
                                      </button>
                                      <button
                                        onClick={() => toggleAccordion('sent', a.account_id)}
                                        className="bg-emerald-50 hover:bg-emerald-100 p-3 rounded-lg text-center transition-colors duration-150 flex flex-col items-center justify-center gap-1"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FaCheckCircle className="w-4 h-4 text-emerald-600" />
                                          <span className="font-semibold text-emerald-700">
                                            {a.sent}
                                          </span>
                                        </div>
                                        <div className="text-xs text-emerald-600">
                                          Sent
                                        </div>
                                      </button>
                                      <button
                                        onClick={() => toggleAccordion('failed', a.account_id)}
                                        className="bg-rose-50 hover:bg-rose-100 p-3 rounded-lg text-center transition-colors duration-150 flex flex-col items-center justify-center gap-1"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FaExclamationCircle className="w-4 h-4 text-rose-600" />
                                          <span className="font-semibold text-rose-700">
                                            {a.failed}
                                          </span>
                                        </div>
                                        <div className="text-xs text-rose-600">
                                          Failed
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Accordion Content for Desktop */}
                              {selectedSender === a.account_id && (
                                <tr>
                                  <td colSpan="4" className="p-0">
                                    <div className="bg-gray-50 border-t border-gray-200">
                                      <div className="p-4">
                                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                          {(() => {
                                            const section = getSectionFromKey(expandedSection, a.account_id);
                                            return section === 'scheduled' ? (
                                              <FaClock className="w-4 h-4 text-blue-600" />
                                            ) : section === 'sent' ? (
                                              <FaCheckCircle className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                              <FaExclamationCircle className="w-4 h-4 text-rose-600" />
                                            );
                                          })()}
                                          {getSectionFromKey(expandedSection, a.account_id)?.toUpperCase()} Emails
                                          <span className="text-sm font-normal text-gray-600 ml-2">
                                            ({emailsData[expandedSection]?.length || 0} items)
                                          </span>
                                        </h4>
                                        <div className="bg-white rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                                          {expandedSection && renderEmailList(
                                            emailsData[expandedSection] || [],
                                            getSectionFromKey(expandedSection, a.account_id) || '',
                                            a.account_id
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="border-t border-gray-200 bg-gray-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FaUser className="w-3 h-3" />
                          Total Allocations
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-900">
                              {allocations.reduce((sum, a) => sum + a.total, 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total Emails
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {[
                              { status: "scheduled", icon: <FaClock className="w-3 h-3" /> },
                              { status: "sent", icon: <FaCheckCircle className="w-3 h-3" /> },
                              { status: "failed", icon: <FaExclamationCircle className="w-3 h-3" /> }
                            ].map(
                              ({ status, icon }) => (
                                <div key={status} className="text-center">
                                  <div className="text-sm font-semibold flex items-center justify-center gap-1">
                                    {icon}
                                    {allocations.reduce(
                                      (sum, a) => sum + a[status],
                                      0
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {status}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {allocations.map((a, index) => (
                      <div
                        key={a.account_id}
                        className="p-4 hover:bg-gray-50/50 transition-colors duration-150"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <FaUser className="text-sm text-blue-700" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {a.sender_name}
                                </h4>
                                <p className="text-sm text-gray-600 truncate">
                                  {a.email}
                                </p>
                              </div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {a.total}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>
                                {Math.round((a.sent / a.total) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                style={{
                                  width: `${(a.sent / a.total) * 100}%`,
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => toggleAccordion('scheduled', a.account_id)}
                                className={`bg-blue-50 p-2 rounded-lg text-center transition-all duration-150 ${expandedSection === `${a.account_id}::scheduled` ? 'ring-2 ring-blue-300' : 'hover:bg-blue-100'} flex flex-col items-center justify-center gap-1`}
                              >
                                <div className="flex items-center gap-1">
                                  <FaClock className="w-3 h-3 text-blue-600" />
                                  <span className="font-semibold text-blue-700">
                                    {a.scheduled}
                                  </span>
                                </div>
                                <div className="text-xs text-blue-600">
                                  Scheduled
                                </div>
                              </button>
                              <button
                                onClick={() => toggleAccordion('sent', a.account_id)}
                                className={`bg-emerald-50 p-2 rounded-lg text-center transition-all duration-150 ${expandedSection === `${a.account_id}::sent` ? 'ring-2 ring-emerald-300' : 'hover:bg-emerald-100'} flex flex-col items-center justify-center gap-1`}
                              >
                                <div className="flex items-center gap-1">
                                  <FaCheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span className="font-semibold text-emerald-700">
                                    {a.sent}
                                  </span>
                                </div>
                                <div className="text-xs text-emerald-600">
                                  Sent
                                </div>
                              </button>
                              <button
                                onClick={() => toggleAccordion('failed', a.account_id)}
                                className={`bg-rose-50 p-2 rounded-lg text-center transition-all duration-150 ${expandedSection === `${a.account_id}::failed` ? 'ring-2 ring-rose-300' : 'hover:bg-rose-100'} flex flex-col items-center justify-center gap-1`}
                              >
                                <div className="flex items-center gap-1">
                                  <FaExclamationCircle className="w-3 h-3 text-rose-600" />
                                  <span className="font-semibold text-rose-700">
                                    {a.failed}
                                  </span>
                                </div>
                                <div className="text-xs text-rose-600">
                                  Failed
                                </div>
                              </button>
                            </div>

                            {/* Accordion Content for Mobile */}
                            {selectedSender === a.account_id && expandedSection && (
                              <div className="mt-4 bg-gray-50 rounded-lg p-4 animate-fadeIn">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const section = getSectionFromKey(expandedSection, a.account_id);
                                      return section === 'scheduled' ? (
                                        <FaClock className="w-4 h-4 text-blue-600" />
                                      ) : section === 'sent' ? (
                                        <FaCheckCircle className="w-4 h-4 text-emerald-600" />
                                      ) : (
                                        <FaExclamationCircle className="w-4 h-4 text-rose-600" />
                                      );
                                    })()}
                                    <span>
                                      {getSectionFromKey(expandedSection, a.account_id)?.toUpperCase()} Emails
                                    </span>
                                  </div>
                                  <span className="text-sm font-normal text-gray-600">
                                    ({emailsData[expandedSection]?.length || 0})
                                  </span>
                                </h4>
                                <div className="bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                                  {renderEmailList(
                                    emailsData[expandedSection] || [],
                                    getSectionFromKey(expandedSection, a.account_id) || '',
                                    a.account_id
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 border-t border-gray-100 bg-white">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:scale-95 flex items-center gap-2"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}