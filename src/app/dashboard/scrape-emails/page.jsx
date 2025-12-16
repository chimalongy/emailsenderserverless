'use client'

import { useState } from 'react'
import { FaEnvelope, FaPlus, FaFolder, FaFileAlt, FaTrash, FaDownload, FaCalendarAlt } from 'react-icons/fa'
import SearchModal from './components/searchmodal'

// Dummy data for previous searches
const dummySearches = [
  {
    id: '1',
    name: 'Plumbing Companies NYC',
    query: 'plumbers in new york city',
    emailCount: 245,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    status: 'completed'
  },
  {
    id: '2',
    name: 'Tech Startups Austin',
    query: 'technology startups austin texas',
    emailCount: 187,
    createdAt: '2024-01-14',
    updatedAt: '2024-01-14',
    status: 'completed'
  },
  {
    id: '3',
    name: 'Real Estate Miami',
    query: 'real estate agents miami florida',
    emailCount: 156,
    createdAt: '2024-01-13',
    updatedAt: '2024-01-13',
    status: 'completed'
  },
  {
    id: '4',
    name: 'Marketing Agencies',
    query: 'digital marketing agencies',
    emailCount: 312,
    createdAt: '2024-01-12',
    updatedAt: '2024-01-12',
    status: 'completed'
  },
  {
    id: '5',
    name: 'Restaurants LA',
    query: 'restaurants los angeles',
    emailCount: 423,
    createdAt: '2024-01-11',
    updatedAt: '2024-01-11',
    status: 'completed'
  },
  {
    id: '6',
    name: 'Healthcare SaaS',
    query: 'healthcare software companies',
    emailCount: 89,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-10',
    status: 'processing'
  }
]

export default function ScrapeEmailsPage() {
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searches, setSearches] = useState(dummySearches)
  const [selectedSearch, setSelectedSearch] = useState(null)

  const handleNewSearch = (newSearch) => {
    setSearches([newSearch, ...searches])
    setShowSearchModal(false)
  }

  const handleDeleteSearch = (id, e) => {
    e.stopPropagation()
    setSearches(searches.filter(search => search.id !== id))
  }

  const handleDownload = (searchId, e) => {
    e.stopPropagation()
    alert(`Downloading emails for search ${searchId}`)
    // In real app, this would trigger CSV download
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Finder</h1>
              <p className="text-gray-600 text-sm mt-1">Search, collect, and manage business emails</p>
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center w-full sm:w-auto"
            >
              <FaPlus className="mr-2" />
              New Search
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg mr-3">
                <FaFolder className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Searches</p>
                <p className="text-xl font-bold text-gray-900">{searches.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FaEnvelope className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Emails</p>
                <p className="text-xl font-bold text-gray-900">
                  {searches.reduce((acc, search) => acc + search.emailCount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <FaFileAlt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-xl font-bold text-gray-900">
                  {searches.filter(s => s.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <FaCalendarAlt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Processing</p>
                <p className="text-xl font-bold text-gray-900">
                  {searches.filter(s => s.status === 'processing').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Files Gallery */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Searches</h2>
            <span className="text-sm text-gray-500">{searches.length} searches</span>
          </div>
          
          {searches.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <FaFolder className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No searches yet</h3>
              <p className="text-gray-600 text-sm mb-4">Create your first search to start collecting emails</p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 inline-flex items-center text-sm"
              >
                <FaPlus className="mr-2" />
                New Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searches.map((search) => (
                <div
                  key={search.id}
                  onClick={() => setSelectedSearch(selectedSearch === search.id ? null : search.id)}
                  className={`bg-white rounded-lg border cursor-pointer transition-all duration-200 hover:shadow ${
                    selectedSearch === search.id ? 'border-teal-500 shadow' : 'border-gray-200 hover:border-teal-200'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-md mr-3 mt-1 ${
                          search.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          {search.status === 'completed' ? (
                            <FaFolder className="h-5 w-5 text-green-600" />
                          ) : (
                            <FaCalendarAlt className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{search.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{search.query}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSearch(search.id, e)}
                        className="text-gray-400 hover:text-red-500 p-1 ml-1"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center text-gray-600">
                          <FaEnvelope className="mr-1.5 h-3.5 w-3.5" />
                          Emails Found
                        </span>
                        <span className="font-medium">{search.emailCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center text-gray-600">
                          <FaCalendarAlt className="mr-1.5 h-3.5 w-3.5" />
                          Created
                        </span>
                        <span>{search.createdAt}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          search.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {search.status === 'completed' ? 'Completed' : 'Processing'}
                        </span>
                      </div>
                    </div>

                    {selectedSearch === search.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleDownload(search.id, e)}
                            className="flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center text-sm"
                          >
                            <FaDownload className="mr-1.5" />
                            Download CSV
                          </button>
                          <button
                            onClick={() => alert(`Viewing details for ${search.name}`)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            Details
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Search performed on {search.createdAt}. Click download to get all {search.emailCount.toLocaleString()} emails.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">How Email Search Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-teal-600 font-bold text-sm">1</span>
              </div>
              <h4 className="font-medium text-gray-800 text-sm mb-1 text-center">Create Search</h4>
              <p className="text-xs text-gray-600 text-center">
                Give your search a name and describe what businesses or professionals you're looking for
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-teal-600 font-bold text-sm">2</span>
              </div>
              <h4 className="font-medium text-gray-800 text-sm mb-1 text-center">We Find Emails</h4>
              <p className="text-xs text-gray-600 text-center">
                Our system searches business directories, websites, and public sources to collect verified emails
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-teal-600 font-bold text-sm">3</span>
              </div>
              <h4 className="font-medium text-gray-800 text-sm mb-1 text-center">Download & Use</h4>
              <p className="text-xs text-gray-600 text-center">
                Access your organized email lists anytime. Download as CSV for use in your outreach campaigns
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Search Modal */}
      {showSearchModal && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onNewSearch={handleNewSearch}
        />
      )}
    </div>
  )
}