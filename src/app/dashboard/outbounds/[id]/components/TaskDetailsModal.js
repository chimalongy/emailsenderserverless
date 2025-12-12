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
  FaEnvelope,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
  FaFileAlt,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

export default function TaskDetailsModal({ onClose, task, allocations, onRefresh }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedSender, setSelectedSender] = useState(null);
  const [emailsData, setEmailsData] = useState({});
  const [loadingEmails, setLoadingEmails] = useState({});
  const [sendingEmails, setSendingEmails] = useState(new Set());
  const [showFullMessage, setShowFullMessage] = useState(false);

  const statusColors = {
    completed: "bg-emerald-500",
    failed: "bg-rose-500",
    pending: "bg-amber-500",
    in_progress: "bg-teal-500",
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

  const toggleMessageExpanded = () => {
    setExpandedSection(expandedSection === 'message' ? null : 'message');
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

  // Truncate message for preview
  const truncateMessage = (message, maxLength = 150) => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const renderEmailList = (emails, type, accountId) => {
    const key = `${accountId}-${type}`;
    const isLoading = loadingEmails[key];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <FaSpinner className="w-4 h-4 text-teal-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Loading emails...</span>
        </div>
      );
    }

    if (!emails || emails.length === 0) {
      return (
        <div className="text-center p-6 text-gray-400 text-sm">
          <FaEnvelope className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No {type} emails found
        </div>
      );
    }

    // Compact email list design
    return (
      <div className="space-y-1">
        {emails.map(email => {
          const isSending = sendingEmails.has(email.id);
          const isSent = type === 'sent';
          const isFailed = type === 'failed';
          const isScheduled = type === 'scheduled';

          return (
            <div key={email.id} className="group flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
              {/* Left side: Email info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-800 text-sm truncate">
                    {email.recipient}
                  </div>
                  {email.subject && (
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                      • {email.subject}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`text-xs flex items-center gap-1 ${
                    isSent ? 'text-emerald-600' : 
                    isFailed ? 'text-rose-600' : 
                    'text-teal-600'
                  }`}>
                    {isScheduled && <FaClock className="w-3 h-3" />}
                    {isSent && <FaCheckCircle className="w-3 h-3" />}
                    {isFailed && <FaExclamationCircle className="w-3 h-3" />}
                    <span>
                      {isScheduled && `Scheduled: ${formatTime(email.scheduled_at)}`}
                      {isSent && `Sent: ${formatTime(email.sent_at)}`}
                      {isFailed && email.error_message && (
                        <span className="truncate max-w-[180px]">{email.error_message}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side: Action button */}
              <div className="ml-2">
                {(isScheduled || isFailed) && (
                  <button
                    onClick={() => isScheduled ? handleSendNow(email.id, email.recipient) : handleResend(email.id, email.recipient)}
                    disabled={isSending}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      isScheduled 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSending ? (
                      <>
                        <FaSpinner className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Sending</span>
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="w-3 h-3" />
                        <span className="hidden sm:inline">
                          {isScheduled ? 'Send Now' : 'Resend'}
                        </span>
                      </>
                    )}
                  </button>
                )}
                {isSent && (
                  <div className="px-2.5 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg">
                    Sent
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-8 rounded-full ${
              statusColors[task.status] || "bg-gray-400"
            }`} />
            <div>
              <h2 className="text-lg font-bold text-gray-800">{task.name}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded flex items-center gap-1">
                  <FaEnvelope className="w-3 h-3" />
                  {task.type}
                </span>
                <span>•</span>
                <span>ID: {task.id?.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Task Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-teal-100 rounded">
                    {task.status === "completed" ? (
                      <FaCheckCircle className="w-4 h-4 text-teal-600" />
                    ) : task.status === "failed" ? (
                      <FaTimesCircle className="w-4 h-4 text-rose-600" />
                    ) : task.status === "pending" ? (
                      <FaClock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <FaSpinner className="w-4 h-4 text-teal-600 animate-spin" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-600">Status</span>
                </div>
                <span className={`px-2 py-1 rounded text-sm font-semibold capitalize ${
                  task.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : task.status === "failed"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-100 rounded">
                    <FaCalendarAlt className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Scheduled</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {task.scheduled_at ? (
                    new Date(task.scheduled_at).toLocaleString("en-US", {
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

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <FaUser className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Senders</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {allocations.length} sender{allocations.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Task Message Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={toggleMessageExpanded}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <FaFileAlt className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Task Message</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Subject: {task.subject || 'No subject'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {expandedSection === 'message' ? 'Hide' : 'Show'} details
                  </span>
                  {expandedSection === 'message' ? (
                    <FaChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FaChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSection === 'message' && (
                <div className="border-t border-gray-200 p-4">
                  {/* Subject */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Subject</h4>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-gray-800 font-medium">{task.subject || 'No subject'}</p>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Message Content</h4>
                      <button
                        onClick={() => setShowFullMessage(!showFullMessage)}
                        className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700"
                      >
                        {showFullMessage ? (
                          <>
                            <FaCompress className="w-3 h-3" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <FaExpand className="w-3 h-3" />
                            Show Full Message
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className={`whitespace-pre-wrap text-gray-800 text-sm ${
                        !showFullMessage && task.body && task.body.length > 500 
                          ? 'max-h-40 overflow-y-auto' 
                          : ''
                      }`}>
                        {task.body ? (
                          showFullMessage 
                            ? task.body 
                            : truncateMessage(task.body, 500)
                        ) : (
                          <p className="text-gray-400 italic">No message content</p>
                        )}
                      </div>
                      {task.body && task.body.length > 500 && !showFullMessage && (
                        <div className="text-center mt-2">
                          <div className="text-xs text-gray-500">
                            {Math.ceil(task.body.length / 500)} screens • {task.body.length} characters
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Allocations Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Allocation Details</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Distribution across sender accounts
                </p>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center p-6">
                  <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FaUser className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No allocations found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {allocations.map((a, index) => (
                    <div key={a.account_id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="space-y-3">
                        {/* Sender Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center flex-shrink-0">
                              <FaUser className="text-sm text-teal-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{a.sender_name}</h4>
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">{a.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-800">{a.total}</div>
                            <div className="text-xs text-gray-500">Total emails</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round((a.sent / a.total) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                              style={{ width: `${(a.sent / a.total) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: 'scheduled', label: 'Scheduled', icon: <FaClock className="w-3 h-3" />, color: 'teal', count: a.scheduled },
                            { key: 'sent', label: 'Sent', icon: <FaCheckCircle className="w-3 h-3" />, color: 'emerald', count: a.sent },
                            { key: 'failed', label: 'Failed', icon: <FaExclamationCircle className="w-3 h-3" />, color: 'rose', count: a.failed }
                          ].map(({ key, label, icon, color, count }) => (
                            <button
                              key={key}
                              onClick={() => toggleAccordion(key, a.account_id)}
                              className={`p-2 rounded-lg text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                expandedSection === `${a.account_id}::${key}`
                                  ? `bg-${color}-100 ring-1 ring-${color}-300`
                                  : `bg-${color}-50 hover:bg-${color}-100`
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {icon}
                                <span className={`font-semibold text-${color}-700`}>
                                  {count}
                                </span>
                              </div>
                              <div className={`text-xs text-${color}-600`}>
                                {label}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Email List Section */}
                        {selectedSender === a.account_id && expandedSection && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-800 flex items-center gap-1.5">
                                {(() => {
                                  const section = getSectionFromKey(expandedSection, a.account_id);
                                  return section === 'scheduled' ? (
                                    <FaClock className="w-3.5 h-3.5 text-teal-600" />
                                  ) : section === 'sent' ? (
                                    <FaCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <FaExclamationCircle className="w-3.5 h-3.5 text-rose-600" />
                                  );
                                })()}
                                <span className="capitalize">
                                  {getSectionFromKey(expandedSection, a.account_id)} Emails
                                </span>
                                <span className="text-sm font-normal text-gray-600">
                                  ({emailsData[expandedSection]?.length || 0})
                                </span>
                              </h5>
                              <button
                                onClick={() => toggleAccordion(null)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <FaChevronUp className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto">
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Total emails: {allocations.reduce((sum, a) => sum + a.total, 0)}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}