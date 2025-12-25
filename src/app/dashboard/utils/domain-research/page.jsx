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

      if (!res.ok) setError(json.error || "Error fetching domain data");
      else setData(json);
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
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-amber-100 text-amber-800";
      case "low": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        
     

        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-10 transition-all duration-300 hover:shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enter Domain Name
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="example.com"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none transition-all"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.trim())}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>
            <button
              onClick={checkDomain}
              disabled={loading || !domain}
              className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Check Domain
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {data && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{data.domain}</h2>
                      <p className="text-gray-600 text-sm mt-1">Last checked: Just now</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getRiskColor(data.riskLabel)}`}>
                    {data.riskLabel} Risk
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">Security Score</div>
                      <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-gray-900">{data.score}</div>
                      <div className="text-gray-500">/100</div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full" 
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">Domain Age</div>
                      <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {data.ageYears ?? "N/A"}
                      <span className="text-lg text-gray-500 ml-1">yrs</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">Snapshots</div>
                      <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.wayback.totalSnapshots}</div>
                    <div className="text-xs text-teal-600 font-medium mt-1">Wayback Archive</div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-600">Status</div>
                      <div className={`w-3 h-3 rounded-full ${data.dropped ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {data.dropped ? "Dropped" : "Active"}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      Nameservers
                    </h4>
                    {data.nameservers?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {data.nameservers.map((ns, i) => (
                          <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg font-mono">
                            {ns}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No nameservers found</p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">Registrar</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{data.registrar}</p>
                        <p className="text-xs text-gray-500">Domain Registrar</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout for Bottom Sections */}
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Wayback Snapshots */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Wayback Snapshots
                  </h3>
                  <a
                    href={data.wayback.allSnapshotsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                  >
                    View All
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                <div className="space-y-4">
                  {data.wayback.lastFiveSnapshots.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block border border-gray-200 hover:border-teal-300 rounded-xl p-4 hover:bg-teal-50/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-teal-700">
                            {s.year} Snapshot
                          </div>
                          <div className="text-sm text-gray-500 mt-1 font-mono">
                            {s.timestamp}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Score Breakdown
                </h3>
                
                <div className="space-y-4">
                  {data.breakdown.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                      </div>
                      <div>
                        <p className="text-gray-800">{b}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer Note */}
        {/* <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Data is sourced from public domain registries and the Wayback Machine.
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div> */}
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