'use client';

import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import {
  FaGlobe, FaCalendarAlt, FaSpinner, FaRobot,
  FaExclamationTriangle, FaCheckCircle, FaPlus,
  FaListUl, FaDatabase, FaMagic, FaExclamationCircle
} from 'react-icons/fa';
import { useAuth } from '../../../components/AuthProvider';
import { supabase } from '../../../lib/supabase';

export default function CreateOutboundModal({ isOpen, onClose, onCreate }) {
  const { user } = useAuth();

  // Form state
  const [selectedDomain, setSelectedDomain] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [automationName, setAutomationName] = useState('');
  const [offerPrice, setOfferPrice] = useState('$1,995');

  // Prospect source: 'auto' | 'paste' | 'scraping'
  const [prospectSource, setProspectSource] = useState('auto');
  const [emailList, setEmailList] = useState('');
  const [selectedScrapingId, setSelectedScrapingId] = useState('');
  const [scrapings, setScrapings] = useState([]);
  const [loadingScrapings, setLoadingScrapings] = useState(false);

  // Domain state
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [domainError, setDomainError] = useState(null);

  // Submit / error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [emailListError, setEmailListError] = useState(null);
  const [scrapingError, setScrapingError] = useState(null);

  // Fetch domains and scrapings whenever modal opens
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

    const fetchScrapings = async () => {
      setLoadingScrapings(true);
      try {
        const { data, error } = await supabase
          .from('scrappings')
          .select('id, name, emails_found')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setScrapings(data || []);
      } catch (err) {
        console.error('Error fetching scrapings:', err);
        setScrapings([]);
      } finally {
        setLoadingScrapings(false);
      }
    };

    fetchDomains();
    fetchScrapings();
  }, [isOpen, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDomain('');
      setStartDate('');
      setStartTime('09:00');
      setAutomationName('');
      setOfferPrice('$1,995');
      setProspectSource('auto');
      setEmailList('');
      setSelectedScrapingId('');
      setScrapings([]);
      setDomainError(null);
      setNameError(null);
      setSubmitError(null);
      setEmailListError(null);
      setScrapingError(null);
    }
  }, [isOpen]);

  const handleSourceChange = (source) => {
    setProspectSource(source);
    setEmailListError(null);
    setScrapingError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameError(null);
    setSubmitError(null);
    setEmailListError(null);
    setScrapingError(null);

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

    // Validate source-specific fields
    if (prospectSource === 'scraping' && !selectedScrapingId) {
      setScrapingError('Please select a scraping to use.');
      return;
    }
    if (prospectSource === 'paste') {
      if (!emailList.trim()) {
        setEmailListError('Please paste at least one email address.');
        return;
      }
      const parsedEmails = emailList.split('\n').map(e => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = parsedEmails.filter(e => !emailRegex.test(e));
      if (invalid.length > 0) {
        setEmailListError(`Invalid email addresses: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`);
        return;
      }
    }

    // Build correct UTC ISO from local date + time
    const [year, month, day] = startDate.split('-').map(Number);
    const [hours, minutes] = (startTime || '09:00').split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const utcStartDateTime = localDate.toISOString();

    // Build request payload based on source
    const payload = {
      name: automationName.trim(),
      domain: selectedDomain,
      startDate: utcStartDateTime,
      price: offerPrice.trim(),
    };
    if (prospectSource === 'paste') payload.emailList = emailList.trim();
    if (prospectSource === 'scraping') payload.scrapingId = selectedScrapingId;
    // 'auto' → neither field, triggers auto-outbound-setup

    setIsSubmitting(true);
    try {
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
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'duplicate_name') {
          setNameError(result.message);
          return;
        }
        throw new Error(result.message || result.error || 'Failed to create outbound.');
      }

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

  const today = new Date().toISOString().split('T')[0];

  const sourceOptions = [
    {
      id: 'auto',
      icon: FaMagic,
      label: 'Auto-scrape',
      description: 'AI finds prospect emails from your domain automatically',
    },
    {
      id: 'scraping',
      icon: FaDatabase,
      label: 'Use existing scraping',
      description: 'Pick from a completed scraping in your library',
    },
    {
      id: 'paste',
      icon: FaListUl,
      label: 'Paste email list',
      description: 'Manually provide a list of prospect emails',
    },
  ];

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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

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
                  setSelectedDomain(e.target.value);
                  setAutomationName(e.target.value);
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
          <p className="text-xs text-gray-500 -mt-2">
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
            <p className="text-xs text-gray-500 mt-1.5">The price at which the domain will be offered.</p>
          </div>

          {/* ── Prospect Source ─────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prospect Source <span className="text-red-500">*</span>
            </label>

            {/* Radio cards */}
            <div className="space-y-2">
              {sourceOptions.map(({ id, icon: Icon, label, description }) => (
                <label
                  key={id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    prospectSource === id
                      ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="prospectSource"
                    value={id}
                    checked={prospectSource === id}
                    onChange={() => handleSourceChange(id)}
                    className="mt-0.5 accent-teal-600 flex-shrink-0"
                  />
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${prospectSource === id ? 'text-teal-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${prospectSource === id ? 'text-teal-700' : 'text-gray-700'}`}>{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Conditional content based on source */}
            {prospectSource === 'scraping' && (
              <div className="mt-3">
                {loadingScrapings ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                    <FaSpinner className="animate-spin" /> Loading scrapings…
                  </div>
                ) : scrapings.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <FaExclamationTriangle className="flex-shrink-0" />
                    No completed scrapings found. Run a scraping first or choose another source.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedScrapingId}
                      onChange={(e) => {
                        setSelectedScrapingId(e.target.value);
                        if (scrapingError) setScrapingError(null);
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none bg-white ${
                        scrapingError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-teal-500'
                      }`}
                    >
                      <option value="">— Select a scraping —</option>
                      {scrapings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.emails_found ? ` (${s.emails_found} emails)` : ''}
                        </option>
                      ))}
                    </select>
                    {scrapingError && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
                        <FaExclamationCircle className="flex-shrink-0 mt-0.5" />
                        {scrapingError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {prospectSource === 'paste' && (
              <div className="mt-3">
                <textarea
                  rows={4}
                  value={emailList}
                  onChange={(e) => {
                    setEmailList(e.target.value);
                    if (emailListError) setEmailListError(null);
                  }}
                  placeholder={`e.g.\njohn@example.com\njane@company.com`}
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
                  <p className="text-xs text-gray-500 mt-1.5">One email address per line.</p>
                )}
              </div>
            )}

            {prospectSource === 'auto' && (
              <div className="mt-3 flex items-start gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                <FaMagic className="flex-shrink-0 mt-0.5 text-teal-500" />
                <span>
                  The AI will use your selected domain to generate relevant search queries, find prospect businesses via Apify, and extract their contact emails automatically.
                </span>
              </div>
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
              disabled={
                isSubmitting || loadingDomains || !selectedDomain || !startDate ||
                !automationName.trim() || !offerPrice.trim() ||
                (prospectSource === 'scraping' && scrapings.length === 0)
              }
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
