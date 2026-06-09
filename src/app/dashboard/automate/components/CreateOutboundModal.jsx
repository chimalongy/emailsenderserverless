'use client';

import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import {
  FaGlobe, FaCalendarAlt, FaSpinner, FaRobot,
  FaExclamationTriangle, FaCheckCircle, FaPlus
} from 'react-icons/fa';
import { useAuth } from '../../../components/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { FaExclamationCircle } from 'react-icons/fa';

export default function CreateOutboundModal({ isOpen, onClose, onCreate }) {
  const { user } = useAuth();

  // Form state
  const [selectedDomain, setSelectedDomain] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [automationName, setAutomationName] = useState('');
  const [offerPrice, setOfferPrice] = useState('$1,995');
  const [emailList, setEmailList] = useState('');

  // Data state
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [domainError, setDomainError] = useState(null);

  // Submit / error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [emailListError, setEmailListError] = useState(null);

  // Fetch domains whenever modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchDomains = async () => {
      setLoadingDomains(true);
      setDomainError(null);

      try {
        const { data, error } = await supabase
          .from('domains')
          .select('id, domain, sold')
          .eq('user_id', user.id)
          .eq('sold', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDomains(data || []);
      } catch (err) {
        console.error('Error fetching domains:', err);
        setDomainError('Failed to load your domains. Please try again.');
        setDomains([]);
      } finally {
        setLoadingDomains(false);
      }
    };

    fetchDomains();
  }, [isOpen, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDomain('');
      setStartDate('');
      setStartTime('09:00');
      setAutomationName('');
      setOfferPrice('$1,995');
      setEmailList('');
      setDomainError(null);
      setNameError(null);
      setSubmitError(null);
      setEmailListError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameError(null);
    setSubmitError(null);
    setEmailListError(null);

    if (!selectedDomain) {
      alert('Please select a domain.');
      return;
    }
    if (!startDate) {
      alert('Please choose a start date.');
      return;
    }
    if (!automationName.trim()) {
      setNameError('Please enter a name for this automation.');
      return;
    }

    if (!offerPrice.trim()) {
      alert('Please enter an offer price.');
      return;
    }

    const localDatetime = `${startDate}T${startTime || '09:00'}`;
    const utcStartDateTime = new Date(localDatetime).toISOString();

    // Local email list validation if provided
    let parsedEmails = [];
    if (emailList.trim()) {
      parsedEmails = emailList
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = parsedEmails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        setEmailListError(`Invalid email addresses: ${invalidEmails.slice(0, 3).join(', ')}${invalidEmails.length > 3 ? '...' : ''}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitError('Your session has expired. Please sign in again.');
        return;
      }

      const response = await fetch('/api/auto-outbounds/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: automationName.trim(),
          domain: selectedDomain,
          startDate: utcStartDateTime,
          price: offerPrice.trim(),
          emailList: emailList.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Surface duplicate-name error inline under the name field
        if (result.error === 'duplicate_name') {
          setNameError(result.message);
          return;
        }
        throw new Error(result.message || result.error || 'Failed to create outbound.');
      }

      // Notify parent so it can update the list
      await onCreate?.({
        domain: selectedDomain,
        startDate,
        name: automationName.trim(),
        price: offerPrice.trim(),
        apiData: result.data,
      });
      onClose();
    } catch (err) {
      console.error('Failed to create outbound:', err);
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Minimum selectable date is today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ animation: 'modalSlideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FaRobot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Outbound Automation</h3>
              <p className="text-teal-100 text-xs mt-0.5">Configure your AI-powered outbound sequence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Automation Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Automation Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={automationName}
              onChange={(e) => {
                setAutomationName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Weekly B2B Real Estate Outbound"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-400 ${
                nameError
                  ? 'border-red-400 focus:ring-red-400 bg-red-50'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
              required
            />
            {nameError && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
                <FaExclamationCircle className="flex-shrink-0 mt-0.5" />
                {nameError}
              </p>
            )}
          </div>

          {/* Domain Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <FaGlobe className="inline w-3.5 h-3.5 mr-1.5 text-teal-600" />
              Sending Domain <span className="text-red-500">*</span>
            </label>

            {domainError && (
              <div className="mb-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <FaExclamationTriangle className="flex-shrink-0" />
                {domainError}
              </div>
            )}

            <div className="relative">
              <select
                value={selectedDomain}
                onChange={(e) => {

                  setSelectedDomain(e.target.value)
                  setAutomationName(e.target.value)
                }}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                disabled={loadingDomains || !!domainError}
                required
              >
                <option value="" disabled>
                  {loadingDomains
                    ? 'Loading domains…'
                    : domains.length === 0
                      ? 'No active domains found'
                      : '— Select a domain —'}
                </option>
                {domains.map((d) => (
                  <option key={d.id} value={d.domain}>
                    {d.domain}
                  </option>
                ))}
              </select>

              {/* Right icon */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                {loadingDomains ? (
                  <FaSpinner className="w-3.5 h-3.5 text-teal-500 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>

            {/* Domain count badge */}
            {!loadingDomains && domains.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <FaCheckCircle className="text-teal-500" />
                {domains.length} active domain{domains.length !== 1 ? 's' : ''} in your portfolio
              </p>
            )}

            {!loadingDomains && domains.length === 0 && !domainError && (
              <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                <FaExclamationTriangle className="text-amber-500" />
                No active domains found. Add domains in your{' '}
                <a href="/dashboard/portfolio" className="text-teal-600 font-semibold hover:underline">Portfolio</a>.
              </p>
            )}
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <FaCalendarAlt className="inline w-3.5 h-3.5 mr-1.5 text-teal-600" />
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            The automation will begin sending on the selected date and time (in your local timezone).
          </p>

          {/* Offer Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Offer Price <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="e.g. $1,995"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              The price at which the domain will be offered.
            </p>
          </div>

          {/* Prospect Email List */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Prospect Email List (Optional)
            </label>
            <textarea
              rows={4}
              value={emailList}
              onChange={(e) => {
                setEmailList(e.target.value);
                if (emailListError) setEmailListError(null);
              }}
              placeholder="e.g.&#10;john@example.com&#10;jane@company.com"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-400 font-mono ${
                emailListError
                  ? 'border-red-400 focus:ring-red-400 bg-red-50'
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
            />
            {emailListError ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
                <FaExclamationCircle className="flex-shrink-0 mt-0.5" />
                {emailListError}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1.5">
                Paste your email list (one per line). If provided, scraping will be bypassed and the campaign goes straight to planning.
              </p>
            )}
          </div>

          {/* General submit error */}
          {submitError && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <FaExclamationCircle className="flex-shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingDomains || !selectedDomain || !startDate || !automationName.trim() || !offerPrice.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin w-3.5 h-3.5" />
                  Creating…
                </>
              ) : (
                <>
                  <FaPlus className="w-3.5 h-3.5" />
                  Create Outbound
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
