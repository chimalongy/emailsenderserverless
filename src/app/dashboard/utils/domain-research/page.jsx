"use client";

import { useState } from "react";

export default function DomainHistoryPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const checkDomain = async () => {
    setError("");
    setData(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/domain-history?domain=${domain}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error fetching domain data");
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") checkDomain();
  };

  const getRiskColor = (label) => {
    switch (label?.toLowerCase()) {
      case "clean": return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "mixed": return "bg-amber-100 text-amber-800 border border-amber-200";
      case "risky": return "bg-red-100 text-red-800 border border-red-200";
      case "high risk": return "bg-red-500 text-white border border-red-600";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'registered': return 'text-emerald-600 bg-emerald-50';
      case 'available': return 'text-blue-600 bg-blue-50';
      case 'unknown': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getBlacklistStatusColor = (blacklisted) => {
    return blacklisted 
      ? 'text-red-600 bg-red-50 border border-red-200' 
      : 'text-emerald-600 bg-emerald-50 border border-emerald-200';
  };

  const formatWaybackUrl = (snapshot) => {
    return `https://web.archive.org/web/${snapshot.timestamp}/${snapshot.original || domain}`;
  };

  const formatThreatType = (threatType) => {
    return threatType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="min-h-screen py-4 md:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto  lg:px-6">
        
        {/* Search Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 mb-6 md:mb-8 lg:mb-10">
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enter Domain Name
              </label>
              <div className="relative">
                <svg className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="example.com"
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.trim())}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>
            <button
              onClick={checkDomain}
              disabled={loading || !domain}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl shadow hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Analyze Domain Security
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl flex items-start gap-2 sm:gap-3 animate-fadeIn">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm sm:text-base">{error}</p>
            </div>
          )}
        </div>

        {data && (
          <div className="space-y-5 sm:space-y-6 md:space-y-8 animate-fadeIn">
            
            {/* Summary Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 md:p-8">
                {/* Domain Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{data.domain}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(data.registrationStatus)}`}>
                          {data.registrationStatus}
                        </span>
                        {data.dropped && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            Previously Dropped
                          </span>
                        )}
                        {data.security?.overallBlacklisted && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500 text-white border border-red-600">
                            BLACKLISTED
                          </span>
                        )}
                        <p className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">Last checked: Just now</p>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${getRiskColor(data.riskLabel)} mt-2 sm:mt-0 self-start sm:self-auto`}>
                    {data.riskLabel} Risk
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Security Score</div>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{data.score}</div>
                      <div className="text-gray-500 text-xs sm:text-sm">/100</div>
                    </div>
                    <div className="mt-2 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          data.score >= 70 ? 'bg-emerald-500' :
                          data.score >= 40 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, data.score))}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Blacklist Status</div>
                      {data.security?.overallBlacklisted ? (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {data.security?.overallBlacklisted ? "YES" : "NO"}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${
                      data.security?.overallBlacklisted ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {data.security?.overallBlacklisted ? 'Blacklisted' : 'Clean'}
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Domain Age</div>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {data.ageYears ?? "N/A"}
                      <span className="text-sm sm:text-lg text-gray-500 ml-1">yrs</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {data.registeredAt ? `Since ${formatDate(data.registeredAt)}` : 'Not available'}
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Wayback Snapshots</div>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {data.wayback?.totalSnapshots || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {data.wayback?.firstArchiveYear ? `First in ${data.wayback.firstArchiveYear}` : 'No archives'}
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Expiration</div>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                      {formatDate(data.expiresAt)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {data.expiresAt ? 'Registration expires' : 'Unknown'}
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-600">Nameservers</div>
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${data.nameservers?.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                      {data.nameservers?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data.nameservers?.length > 0 ? 'Configured' : 'None found'}
                    </div>
                  </div>
                </div>

                {/* Blacklist Alert Banner */}
                {data.security?.overallBlacklisted && (
                  <div className="mb-6 sm:mb-8 p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-800 text-sm sm:text-base mb-1">SECURITY WARNING</h3>
                        <p className="text-red-700 text-sm">
                          This domain has been flagged as potentially harmful or malicious. It is listed on one or more security blacklists.
                          {data.security?.googleSafeBrowsing?.blacklisted && (
                            <span> Flagged by Google Safe Browsing as potentially dangerous.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="mt-6 space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6">
                  {/* Blacklist Status Summary */}
                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Security Status
                    </h4>
                    <div className="space-y-2">
                      <div className={`px-3 py-2 rounded-lg border ${getBlacklistStatusColor(data.security?.googleSafeBrowsing?.blacklisted)}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Google Safe Browsing</span>
                          {data.security?.googleSafeBrowsing?.blacklisted ? (
                            <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full">BLACKLISTED</span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">CLEAN</span>
                          )}
                        </div>
                        {data.security?.googleSafeBrowsing?.detail && typeof data.security.googleSafeBrowsing.detail === 'string' && (
                          <p className="text-xs text-gray-600 mt-1">{data.security.googleSafeBrowsing.detail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      Nameservers
                    </h4>
                    {data.nameservers?.length > 0 ? (
                      <div className="space-y-1">
                        {data.nameservers.map((ns, i) => (
                          <div key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-lg font-mono truncate">
                            {ns}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm px-2 py-1.5 bg-gray-50 rounded-lg">No nameservers found</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base">Registrar</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{data.registrar}</p>
                        <p className="text-xs text-gray-500">Domain Registrar</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Domain Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-gray-600">Words:</span>
                        <span className="ml-1 text-gray-900">{data.domainMetrics?.wordCount || 0}</span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-gray-600">Numbers:</span>
                        <span className="ml-1 text-gray-900">{data.domainMetrics?.hasNumber ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-gray-600">Hyphen:</span>
                        <span className="ml-1 text-gray-900">{data.domainMetrics?.hasHyphen ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-gray-600">Readability:</span>
                        <span className="ml-1 text-gray-900">{data.domainMetrics?.pronounceabilityScore || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Column Layout for Middle Sections */}
            <div className="space-y-5 sm:space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6 lg:gap-8">
              
              {/* Blacklist Details */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Blacklist Checks
                </h3>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Google Safe Browsing */}
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${data.security?.googleSafeBrowsing?.blacklisted ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      Google Safe Browsing
                      {data.security?.googleSafeBrowsing?.blacklisted && (
                        <span className="ml-auto text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          DANGEROUS
                        </span>
                      )}
                    </h4>
                    
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg border ${data.security?.googleSafeBrowsing?.blacklisted ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">Status:</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${data.security?.googleSafeBrowsing?.blacklisted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {data.security?.googleSafeBrowsing?.blacklisted ? 'BLACKLISTED' : 'CLEAN'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Provider:</span>
                          <span className="text-xs text-gray-600">{data.security?.googleSafeBrowsing?.provider || 'Google'}</span>
                        </div>
                      </div>
                      
                      {data.security?.googleSafeBrowsing?.blacklisted && Array.isArray(data.security.googleSafeBrowsing.detail) && (
                        <div className="mt-3">
                          <h5 className="font-medium text-gray-700 text-sm mb-2">Threat Details:</h5>
                          <div className="space-y-2">
                            {data.security.googleSafeBrowsing.detail.map((match, index) => (
                              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start justify-between mb-1">
                                  <span className="font-medium text-sm text-red-700">
                                    {match.threatType ? formatThreatType(match.threatType) : 'Malicious Content'}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                    {match.platformType || 'All Platforms'}
                                  </span>
                                </div>
                                {match.cacheDuration && (
                                  <p className="text-xs text-gray-600">
                                    Cache: {match.cacheDuration}
                                  </p>
                                )}
                                {match.threatEntryType && (
                                  <p className="text-xs text-gray-600">
                                    Type: {match.threatEntryType}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Blacklists */}
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                      Additional Security Checks
                    </h4>
                    
                    {data.security?.additionalBlacklists && data.security.additionalBlacklists.length > 0 ? (
                      <div className="space-y-2">
                        {data.security.additionalBlacklists.map((list, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            list.blacklisted 
                              ? 'bg-red-50 border-red-200' 
                              : list.detail?.includes('Error')
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{list.name}</span>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                list.blacklisted 
                                  ? 'bg-red-100 text-red-700'
                                  : list.detail?.includes('Error')
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}>
                                {list.blacklisted ? 'LISTED' : list.detail?.includes('Error') ? 'ERROR' : 'CLEAN'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{list.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <p className="text-gray-500 text-sm">No additional blacklist data available</p>
                      </div>
                    )}
                  </div>

                  {/* Security Recommendations */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Security Recommendations
                    </h5>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {data.security?.overallBlacklisted ? (
                        <>
                          <li>• Avoid visiting this domain in your browser</li>
                          <li>• Do not download files from this domain</li>
                          <li>• Consider it potentially malicious</li>
                          <li>• Report suspicious activity to your IT department</li>
                        </>
                      ) : (
                        <>
                          <li>• Domain appears clean in security databases</li>
                          <li>• Exercise normal caution when browsing</li>
                          <li>• Keep your browser and security software updated</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* DNS Records */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  DNS Records
                </h3>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* MX Records */}
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
                      MX Records ({data.domainMetrics?.mxRecords?.length || 0})
                    </h4>
                    {data.domainMetrics?.mxRecords?.length > 0 ? (
                      <div className="space-y-1 sm:space-y-2">
                        {data.domainMetrics.mxRecords.map((mx, i) => (
                          <div key={i} className="p-2 sm:p-3 bg-gray-50 rounded-lg font-mono text-xs sm:text-sm break-all">
                            {mx}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm p-2 sm:p-3 bg-gray-50 rounded-lg">No MX records found</p>
                    )}
                  </div>

                  {/* A Records */}
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
                      A Records ({data.domainMetrics?.aRecords?.length || 0})
                    </h4>
                    {data.domainMetrics?.aRecords?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {data.domainMetrics.aRecords.map((record, i) => (
                          <span key={i} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-lg font-mono break-all">
                            {record}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm">No A records found</p>
                    )}
                  </div>

                  {/* AAAA Records */}
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500"></div>
                      AAAA Records ({data.domainMetrics?.aaaaRecords?.length || 0})
                    </h4>
                    {data.domainMetrics?.aaaaRecords?.length > 0 ? (
                      <div className="space-y-1 sm:space-y-2">
                        {data.domainMetrics.aaaaRecords.map((record, i) => (
                          <div key={i} className="p-2 sm:p-3 bg-gray-50 rounded-lg font-mono text-xs sm:text-sm break-all">
                            {record}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm">No AAAA records found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Wayback History */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Wayback Machine History
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  {data.wayback?.totalSnapshots > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">{data.wayback.totalSnapshots}</p>
                          <p className="text-xs sm:text-sm text-gray-600">Total snapshots</p>
                        </div>
                        <div>
                          <p className="text-lg sm:text-xl font-semibold text-gray-900">{data.wayback.firstArchiveYear}</p>
                          <p className="text-xs sm:text-sm text-gray-600">First archived</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        <h4 className="font-medium text-gray-700 text-sm sm:text-base">Recent Snapshots:</h4>
                        {data.wayback.lastFiveSnapshots?.map((snapshot, i) => (
                          <a
                            key={i}
                            href={snapshot.url || formatWaybackUrl(snapshot)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-teal-600 truncate">
                                {snapshot.timestamp?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || 'Unknown date'}
                              </p>
                              {snapshot.year && (
                                <p className="text-xs text-gray-500">{snapshot.year}</p>
                              )}
                            </div>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-teal-500 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                      
                      <a
                        href={data.wayback.allSnapshotsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 sm:gap-2 text-teal-600 hover:text-teal-700 font-medium text-sm sm:text-base mt-3 sm:mt-4"
                      >
                        View all snapshots on Wayback Machine
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 002 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </>
                  ) : (
                    <div className="text-center py-4 sm:py-6 md:py-8">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500 text-sm sm:text-base">No Wayback Machine history found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Two Column Layout for Bottom Sections */}
            <div className="space-y-5 sm:space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 lg:gap-8">

              {/* TLD Availability */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  TLD Availability for "{data.domain.split('.')[0]}"
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {data.tldAvailability && data.tldAvailability.length > 0 ? (
                    data.tldAvailability.map((tld, i) => (
                      <div 
                        key={i}
                        className={`p-2 sm:p-3 rounded-lg border transition-all ${
                          tld.status === 'available' 
                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' 
                            : tld.status === 'registered'
                            ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            : 'bg-amber-50 border-amber-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="font-mono text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2 truncate">
                          {tld.domain}
                        </div>
                        <div className={`text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full inline-block ${
                          tld.status === 'available' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : tld.status === 'registered'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tld.status.charAt(0).toUpperCase() + tld.status.slice(1)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 sm:col-span-3 text-center py-4 sm:py-6 text-gray-500 text-sm sm:text-base">
                      No TLD availability data
                    </div>
                  )}
                </div>
                
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-400"></div>
                      <span>Registered</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500"></div>
                      <span>Unknown</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Security Score Breakdown
                </h3>
                
                <div className="space-y-2 sm:space-y-4">
                  {data.breakdown && data.breakdown.length > 0 ? (
                    data.breakdown.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          b.startsWith('+') ? 'bg-emerald-100' : 
                          b.startsWith('-') ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <div className={`text-xs sm:text-sm font-semibold ${
                            b.startsWith('+') ? 'text-emerald-600' : 
                            b.startsWith('-') ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {b.startsWith('+') || b.startsWith('-') ? b.substring(0, 3) : ''}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm sm:text-base ${
                            b.startsWith('+') ? 'text-emerald-700' : 
                            b.startsWith('-') ? 'text-red-700' : 'text-gray-700'
                          } break-words`}>
                            {b.substring(4)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm sm:text-base">
                      No breakdown available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="bg-teal-50 rounded-xl sm:rounded-2xl shadow-lg border border-teal-100 p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Overall Security Assessment</h3>
              </div>
              
              <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
                <div>
                  <p className="text-gray-700 text-sm sm:text-base">
                    This domain has a <span className="font-semibold">{data.riskLabel.toLowerCase()}</span> risk profile 
                    with a security score of <span className="font-bold">{data.score}/100</span>.
                    {data.security?.overallBlacklisted && (
                      <span className="font-semibold text-red-600"> It has been flagged on security blacklists.</span>
                    )}
                    {data.ageYears > 0 && ` It has been registered for approximately ${data.ageYears} years.`}
                    {data.registrationStatus === 'available' && ' This domain is currently available for registration.'}
                    {data.dropped && ' This domain was previously dropped and re-registered.'}
                    {data.wayback?.totalSnapshots > 0 && ` There are ${data.wayback.totalSnapshots} historical snapshots available.`}
                    {data.domainMetrics?.hasNumber && ' The domain contains numbers, which may affect readability.'}
                    {data.domainMetrics?.hasHyphen && ' The domain contains hyphens, which can be less memorable.'}
                    {!data.security?.overallBlacklisted && ' No security blacklist issues were detected.'}
                  </p>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Security Rating:</span>
                    <span className={`font-semibold text-xs sm:text-sm ${getRiskColor(data.riskLabel)} px-2 py-1 sm:px-3 sm:py-1 rounded-full`}>
                      {data.riskLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Blacklist Status:</span>
                    <span className={`font-semibold text-xs sm:text-sm ${data.security?.overallBlacklisted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} px-2 py-1 sm:px-3 sm:py-1 rounded-full`}>
                      {data.security?.overallBlacklisted ? 'BLACKLISTED' : 'CLEAN'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Registration Status:</span>
                    <span className={`font-semibold text-xs sm:text-sm ${getStatusColor(data.registrationStatus)} px-2 py-1 sm:px-3 sm:py-1 rounded-full`}>
                      {data.registrationStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Domain Age:</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {data.ageYears > 0 ? `${data.ageYears} years` : 'Unknown'}
                    </span>
                  </div>
                  {data.dropped && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">History:</span>
                      <span className="font-semibold text-red-600 text-xs sm:text-sm bg-red-50 px-2 py-1 sm:px-3 sm:py-1 rounded-full">
                        Previously Dropped
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="mt-8 sm:mt-10 md:mt-12 text-center text-gray-500 text-xs sm:text-sm px-2">
          <p>Data provided by RDAP, IANA, DNS checks, Wayback Machine, and Google Safe Browsing. Results are for informational purposes only.</p>
        </div>
      </div>
      
      {/* Add custom styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}