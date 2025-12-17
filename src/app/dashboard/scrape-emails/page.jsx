'use client'

import { useState, useEffect } from 'react'
import { FaEnvelope, FaPlus, FaFolder, FaFileAlt, FaTrash, FaDownload, FaCalendarAlt, FaSpinner,FaSearch , FaExclamationCircle, FaSync } from 'react-icons/fa'
import SearchModal from './components/searchmodal'
import { supabase } from '../../lib/supabase'
import { useAuth } from "../../components/AuthProvider"

export default function ScrapeEmailsPage() {
  const { user } = useAuth()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSearch, setSelectedSearch] = useState(null)

  // Fetch searches from database
  const fetchSearches = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('scrappings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (supabaseError) {
        console.error('Error fetching searches:', supabaseError)
        setError('Failed to load searches. Please try again.')
        return
      }
      
      // Transform database data to match component structure
      const formattedSearches = data.map(search => ({
        id: search.id,
        name: search.name,
        query: search.queries?.join(', ') || 'URL list processing',
        emailCount: search.email_count || 0,
        createdAt: new Date(search.created_at).toISOString().split('T')[0],
        updatedAt: new Date(search.updated_at).toISOString().split('T')[0],
        status: search.status || 'pending',
        method: search.method,
        queries: search.queries || [],
        urls: search.urls || []
      }))
      
      setSearches(formattedSearches)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchSearches()
    }
  }, [user])

  // Set up real-time subscription for search updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('scrappings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrappings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Refresh data when changes occur
          fetchSearches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleNewSearch = (newSearch) => {
    // Add the new search to the beginning of the list
    const formattedSearch = {
      id: newSearch.id,
      name: newSearch.name,
      query: newSearch.queries?.join(', ') || 'URL list processing',
      emailCount: newSearch.email_count || 0,
      createdAt: new Date(newSearch.created_at).toISOString().split('T')[0],
      updatedAt: new Date(newSearch.updated_at).toISOString().split('T')[0],
      status: newSearch.status || 'pending',
      method: newSearch.method,
      queries: newSearch.queries || [],
      urls: newSearch.urls || []
    }
    
    setSearches(prev => [formattedSearch, ...prev])
    setShowSearchModal(false)
  }

  const handleDeleteSearch = async (id, e) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this search?')) return
    
    try {
      const { error } = await supabase
        .from('scrappings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Error deleting search:', error)
        alert('Failed to delete search. Please try again.')
        return
      }
      
      // Remove from local state
      setSearches(searches.filter(search => search.id !== id))
      if (selectedSearch === id) {
        setSelectedSearch(null)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const handleDownload = async (search, e) => {
    e.stopPropagation()
    
    if (search.status !== 'completed') {
      alert('This search is still processing. Please wait until it completes to download.')
      return
    }
    
    try {
      // First, fetch the emails for this search
      const { data: emails, error } = await supabase
        .from('emails') // Assuming you have an emails table
        .select('*')
        .eq('scrapping_id', search.id)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching emails:', error)
        alert('Failed to fetch emails for download.')
        return
      }
      
      if (!emails || emails.length === 0) {
        alert('No emails found for this search.')
        return
      }
      
      // Create CSV content
      const headers = ['Email', 'Source', 'Website', 'Name', 'Company', 'Title', 'Location', 'Found At']
      const csvRows = emails.map(email => [
        email.email || '',
        email.source || '',
        email.website || '',
        email.name || '',
        email.company || '',
        email.title || '',
        email.location || '',
        email.created_at ? new Date(email.created_at).toLocaleString() : ''
      ])
      
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${search.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_emails.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to prepare download. Please try again.')
    }
  }

  const handleRetryFetch = () => {
    fetchSearches()
  }

  if (loading && searches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your searches...</p>
        </div>
      </div>
    )
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetryFetch}
                className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                title="Refresh searches"
              >
                <FaSync className="mr-2" />
                Refresh
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center w-full sm:w-auto"
              >
                <FaPlus className="mr-2" />
                New Search
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <FaExclamationCircle className="h-5 w-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={handleRetryFetch}
                className="text-sm text-red-700 hover:text-red-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

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
                  {searches.reduce((acc, search) => acc + (search.emailCount || 0), 0).toLocaleString()}
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
                  {searches.filter(s => s.status === 'processing' || s.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Files Gallery */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Your Searches</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{searches.length} searches</span>
              {loading && <FaSpinner className="h-4 w-4 text-teal-600 animate-spin" />}
            </div>
          </div>
          
          {searches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FaFolder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No searches yet</h3>
              <p className="text-gray-600 text-sm mb-4 max-w-md mx-auto">
                Create your first search to start collecting business emails. Search by keywords or add specific website URLs.
              </p>
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
                          search.status === 'completed' ? 'bg-green-100' : 
                          search.status === 'failed' ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                          {search.status === 'completed' ? (
                            <FaFolder className="h-5 w-5 text-green-600" />
                          ) : search.status === 'failed' ? (
                            <FaExclamationCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <FaCalendarAlt className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{search.name}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {search.method === 'query' ? (
                              <span className="flex items-center">
                                <FaSearch className="mr-1 h-3 w-3" />
                                {search.queries?.length || 0} queries
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <FaEnvelope className="mr-1 h-3 w-3" />
                                {search.urls?.length || 0} URLs
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSearch(search.id, e)}
                        className="text-gray-400 hover:text-red-500 p-1 ml-1"
                        disabled={loading}
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
                        <span className="font-medium">{(search.emailCount || 0).toLocaleString()}</span>
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
                            : search.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {selectedSearch === search.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleDownload(search, e)}
                            disabled={search.status !== 'completed'}
                            className={`flex-1 px-3 py-1.5 rounded-lg flex items-center justify-center text-sm ${
                              search.status === 'completed'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
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
                          Created on {search.createdAt}. 
                          {search.method === 'query' && ` ${search.queries?.length || 0} search queries.`}
                          {search.method === 'urls' && ` ${search.urls?.length || 0} URLs to process.`}
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
                Give your search a name and describe what businesses or professionals you&apos;re looking for
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