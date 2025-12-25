'use client'
import React from 'react';
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import {
  FaArrowLeft,
  FaEnvelope,
  FaDownload,
  FaSpinner,
  FaCalendarAlt,
  FaFileAlt,
  FaUser,
  FaBuilding,
  FaMapMarkerAlt,
  FaGlobe,
  FaTrash,
  FaEdit,
  FaSave,
  FaPlus,
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaCopy,
  FaCheckSquare,
  FaSquare,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaListAlt,
  FaChevronRight,
  FaEye,
  FaEyeSlash,
  FaLink
} from 'react-icons/fa'
import Link from 'next/link'

export default function ScrapeDetailsPage() {
  const { scrape_id } = useParams()
  const id = scrape_id
  const router = useRouter()
  const { user } = useAuth()
  
  const [search, setSearch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scrapedData, setScrapedData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [expandedSources, setExpandedSources] = useState(new Set())
  const [isAddingEmail, setIsAddingEmail] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [showUrls, setShowUrls] = useState(false)

  // Fetch search details and emails
  const fetchSearchDetails = useCallback(async () => {
    if (!user || !id) return
    
    try {
      setLoading(true)
      setStatusMessage('')
      
      const { data, error } = await supabase
        .from('scrappings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          setStatusMessage('Search not found or you do not have permission to view it.')
        } else {
          throw error
        }
      }
      
      if (data) {
        setSearch(data)
        
        if (data.emails && data.emails.length > 0) {
          const processedData = processScrapedData(data.emails)
          setScrapedData(processedData)
          setFilteredData(processedData)
        } else {
          setScrapedData([])
          setFilteredData([])
        }
      }
    } catch (error) {
      console.error('Error fetching search details:', error)
      setStatusMessage('Failed to load search details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, id])

  // Helper function to process scraped data and ensure unique keys
  const processScrapedData = (data) => {
    if (!data || !Array.isArray(data)) return []
    
    const urlCount = {}
    const processed = []
    
    data.forEach((item, index) => {
      if (item && item.link_scraped) {
        urlCount[item.link_scraped] = (urlCount[item.link_scraped] || 0) + 1
        
        const uniqueId = urlCount[item.link_scraped] > 1 
          ? `${item.link_scraped}-${urlCount[item.link_scraped]}` 
          : item.link_scraped
        
        processed.push({
          ...item,
          uniqueId,
          originalIndex: index,
          serialNumber: index + 1 // Add serial number
        })
      }
    })
    
    return processed
  }

  // Initial fetch
  useEffect(() => {
    fetchSearchDetails()
  }, [fetchSearchDetails])

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !id) return

    const channel = supabase
      .channel(`scrape-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scrappings',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Real-time update:', payload)
          fetchSearchDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, id, fetchSearchDetails])

  // Filter sources based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(scrapedData)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = scrapedData.filter(item => 
      item.link_scraped?.toLowerCase().includes(term) ||
      item.emails?.some(email => email.toLowerCase().includes(term))
    )
    setFilteredData(filtered)
  }, [searchTerm, scrapedData])

  // Toggle source expansion
  const toggleSourceExpansion = (uniqueId) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(uniqueId)) {
      newExpanded.delete(uniqueId)
      setIsAddingEmail(null)
    } else {
      newExpanded.add(uniqueId)
    }
    setExpandedSources(newExpanded)
  }

  // Start adding email to a source
  const startAddEmail = (uniqueId) => {
    setIsAddingEmail(uniqueId)
    setNewEmail('')
    if (!expandedSources.has(uniqueId)) {
      setExpandedSources(new Set([...expandedSources, uniqueId]))
    }
  }

  // Cancel adding email
  const cancelAddEmail = () => {
    setIsAddingEmail(null)
    setNewEmail('')
  }

  // Save new email to source
  const saveNewEmail = async (uniqueId) => {
    if (!newEmail.trim()) {
      alert('Email is required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address')
      return
    }

    setIsSaving(true)
    try {
      const updatedData = scrapedData.map(item => {
        if (item.uniqueId === uniqueId) {
          return {
            ...item,
            emails: [...(item.emails || []), newEmail.trim()]
          }
        }
        return item
      })
      
      const dataForSupabase = updatedData.map(({ uniqueId, originalIndex, serialNumber, ...rest }) => rest)
      
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: dataForSupabase
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setScrapedData(updatedData)
      setIsAddingEmail(null)
      setNewEmail('')
      setStatusMessage('Email added successfully!')
      
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error adding email:', error)
      alert('Failed to add email. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete email from source
  const deleteEmail = async (uniqueId, emailToDelete) => {
    if (!confirm(`Are you sure you want to delete email: ${emailToDelete}?`)) return
    
    setIsSaving(true)
    try {
      const updatedData = scrapedData.map(item => {
        if (item.uniqueId === uniqueId) {
          return {
            ...item,
            emails: (item.emails || []).filter(email => email !== emailToDelete)
          }
        }
        return item
      })
      
      const dataForSupabase = updatedData.map(({ uniqueId, originalIndex, serialNumber, ...rest }) => rest)
      
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: dataForSupabase
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setScrapedData(updatedData)
      setStatusMessage('Email deleted successfully!')
      
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting email:', error)
      alert('Failed to delete email. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete entire source
  const deleteSource = async (uniqueId) => {
    if (!confirm(`Are you sure you want to delete this source and all its emails?`)) return
    
    setIsSaving(true)
    try {
      const updatedData = scrapedData.filter(item => item.uniqueId !== uniqueId)
      
      const dataForSupabase = updatedData.map(({ uniqueId, originalIndex, serialNumber, ...rest }) => rest)
      
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: dataForSupabase
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setScrapedData(updatedData)
      setExpandedSources(prev => {
        const newSet = new Set(prev)
        newSet.delete(uniqueId)
        return newSet
      })
      setStatusMessage('Source deleted successfully!')
      
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting source:', error)
      alert('Failed to delete source. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Copy to clipboard with status message
  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text)
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), 2000)
  }

  // Copy all emails to clipboard
  const copyAllEmails = () => {
    const allEmails = scrapedData.flatMap(item => item.emails || [])
    if (allEmails.length === 0) {
      alert('No emails to copy')
      return
    }
    
    copyToClipboard(allEmails.join('\n'), `Copied ${allEmails.length} emails to clipboard!`)
  }

  // NEW: Copy all URLs to clipboard
  const copyAllUrls = () => {
    if (!search || !search.urls || search.urls.length === 0) {
      alert('No URLs to copy')
      return
    }
    
    const urlsText = search.urls.join('\n')
    copyToClipboard(urlsText, `Copied ${search.urls.length} URLs to clipboard!`)
  }

  // Download CSV
  const downloadCSV = () => {
    const allEmails = scrapedData.flatMap(item => 
      (item.emails || []).map(email => ({
        email,
        source: item.link_scraped
      }))
    )
    
    if (allEmails.length === 0) {
      alert('No emails to download')
      return
    }

    const headers = ['S/N', 'Email', 'Source']
    const csvRows = allEmails.map(({ email, source }, index) => [
      index + 1,
      email || '',
      source || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${search.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_emails.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Function to truncate URL for display
  const truncateUrl = (url, maxLength = 50) => {
    if (!url) return 'N/A'
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  // Count total emails
  const countTotalEmails = () => {
    if (!scrapedData || !Array.isArray(scrapedData)) return 0
    return scrapedData.reduce((total, item) => total + (item.emails?.length || 0), 0)
  }

  // Count total sources
  const countTotalSources = () => {
    return scrapedData.length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading search details...</p>
        </div>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <Link 
              href="/dashboard/scrape-emails" 
              className="inline-flex items-center text-teal-600 hover:text-teal-700 text-sm sm:text-base"
            >
              <FaArrowLeft className="mr-1 sm:mr-2" />
              Back to Searches
            </Link>
          </div>
          <div className="text-center py-8 sm:py-12">
            <FaExclamationTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Search Not Found</h2>
            <p className="text-gray-600 text-sm sm:text-base">{statusMessage || 'The search you are looking for does not exist or you do not have permission to view it.'}</p>
            <Link 
              href="/dashboard/scrape-emails" 
              className="inline-block mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm sm:text-base"
            >
              Go Back to Searches
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Back button and Status */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <Link 
              href="/dashboard/scrape-emails" 
              className="inline-flex items-center text-teal-600 hover:text-teal-700 text-xs sm:text-sm mb-2 truncate"
            >
              <FaArrowLeft className="mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Back to All Searches</span>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate min-w-0" title={search.name}>
                {search.name}
              </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(search.status)} self-start sm:self-auto flex-shrink-0`}>
                {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
              </span>
            </div>
          </div>
          
          {statusMessage && (
            <div className="px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg text-xs sm:text-sm flex-shrink-0">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Search Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaFileAlt className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Search Method</span>
              </div>
              <p className="text-gray-900 capitalize text-sm truncate" title={search.method}>
                {search.method}
              </p>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaEnvelope className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Emails Found</span>
              </div>
              <p className="text-gray-900 text-base sm:text-lg lg:text-xl font-semibold truncate">
                {countTotalEmails().toLocaleString()}
              </p>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaGlobe className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Sources</span>
              </div>
              <p className="text-gray-900 text-base sm:text-lg lg:text-xl font-semibold truncate">
                {countTotalSources().toLocaleString()}
              </p>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaCalendarAlt className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Last Updated</span>
              </div>
              <p className="text-gray-900 text-xs sm:text-sm truncate" title={formatDate(search.updated_at)}>
                {formatDate(search.updated_at)}
              </p>
            </div>
          </div>
          
          {/* Search Details */}
          <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Search Details</h3>
            {search.method === 'query' ? (
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Search Queries:</p>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {search.queries?.map((query, index) => (
                    <span key={index} className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs truncate max-w-[200px]" title={query}>
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    URLs to Process: <span className="font-medium">{search.urls?.length || 0} URLs</span>
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* NEW: Copy All URLs Button */}
                    <button
                      onClick={copyAllUrls}
                      disabled={!search.urls || search.urls.length === 0}
                      className={`px-2 sm:px-3 py-1.5 rounded-lg flex items-center justify-center text-xs sm:text-sm ${
                        !search.urls || search.urls.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title="Copy all URLs to clipboard"
                    >
                      <FaLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Copy URLs</span>
                      <span className="sm:hidden">URLs</span>
                    </button>
                    
                    <button
                      onClick={() => setShowUrls(!showUrls)}
                      className="flex items-center text-teal-600 hover:text-teal-700 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {showUrls ? (
                        <>
                          <span className="mr-1">Hide</span>
                          <FaChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span className="mr-1">Show</span>
                          <FaChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {showUrls && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                      {search.urls?.map((url, index) => (
                        <div key={index} className="flex items-start group hover:bg-gray-100 p-1 rounded">
                          <FaGlobe className="mt-0.5 mr-2 text-gray-400 flex-shrink-0 h-3 w-3" />
                          <div className="flex-1 min-w-0">
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm text-gray-900 hover:text-teal-600 break-all"
                              title={url}
                            >
                              <span className="truncate block">{truncateUrl(url, 60)}</span>
                            </a>
                          </div>
                          <button
                            onClick={() => copyToClipboard(url, 'URL copied!')}
                            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy URL"
                          >
                            <FaCopy className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {search.urls && search.urls.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Showing {search.urls.length} URLs
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex-1 w-full min-w-0">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                <input
                  type="text"
                  placeholder="Search sources or emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadCSV}
                disabled={countTotalEmails() === 0}
                className={`px-3 py-2 rounded-lg flex items-center justify-center text-xs sm:text-sm flex-1 sm:flex-none ${
                  countTotalEmails() === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <FaDownload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">CSV</span>
              </button>
              
              <button
                onClick={copyAllEmails}
                disabled={countTotalEmails() === 0}
                className={`px-3 py-2 rounded-lg flex items-center justify-center text-xs sm:text-sm flex-1 sm:flex-none ${
                  countTotalEmails() === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FaCopy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Copy All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sources Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <FaGlobe className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">No sources found</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-4">
                {searchTerm ? 'Try a different search term' : 'Wait for scraping to complete or add URLs manually'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sm:w-16">
                      S/N
                    </th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source URL
                    </th>
                    <th className="hidden sm:table-cell px-4 lg:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emails
                    </th>
                    <th className="hidden sm:table-cell px-4 lg:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => {
                    const isExpanded = expandedSources.has(item.uniqueId)
                    const hasEmails = item.emails && item.emails.length > 0
                    const emailCount = item.emails?.length || 0
                    
                    return (
                      <React.Fragment key={item.uniqueId}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 lg:px-6 py-3 align-top">
                            <div className="text-xs sm:text-sm font-medium text-gray-500">
                              {item.serialNumber}.
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3">
                            <div className="min-w-0">
                              {/* Mobile View: Link and actions together */}
                              <div className="sm:hidden mb-2">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => toggleSourceExpansion(item.uniqueId)}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                  >
                                    {isExpanded ? (
                                      <FaChevronDown className="h-3 w-3" />
                                    ) : (
                                      <FaChevronRight className="h-3 w-3" />
                                    )}
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => startAddEmail(item.uniqueId)}
                                      className="text-teal-600 hover:text-teal-900 p-1"
                                      title="Add email"
                                    >
                                      <FaPlus className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(item.link_scraped, 'URL copied!')}
                                      className="text-blue-600 hover:text-blue-900 p-1"
                                      title="Copy URL"
                                    >
                                      <FaCopy className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteSource(item.uniqueId)}
                                      className="text-red-600 hover:text-red-900 p-1"
                                      title="Delete source"
                                    >
                                      <FaTrash className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Link name */}
                              <div className="flex items-center min-w-0">
                                <div className="hidden sm:block">
                                  <button
                                    onClick={() => toggleSourceExpansion(item.uniqueId)}
                                    className="mr-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                                  >
                                    {isExpanded ? (
                                      <FaChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                    ) : (
                                      <FaChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={item.link_scraped} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-medium text-teal-600 hover:text-teal-800 truncate block"
                                    title={item.link_scraped}
                                  >
                                    {truncateUrl(item.link_scraped, 35)}
                                  </a>
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {emailCount} email{emailCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Mobile View: Email preview */}
                              <div className="sm:hidden mt-2">
                                {hasEmails ? (
                                  <div className="flex items-center min-w-0">
                                    <FaEnvelope className="mr-2 text-gray-400 h-3 w-3 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-900 truncate" title={item.emails[0]}>
                                        {truncateUrl(item.emails[0], 25)}
                                      </div>
                                      {emailCount > 1 && (
                                        <div className="text-xs text-gray-500 truncate">
                                          +{emailCount - 1} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-gray-400">
                                    <FaEnvelope className="mr-2 h-3 w-3 flex-shrink-0" />
                                    <span className="text-xs">No emails</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-4 lg:px-6 py-3">
                            {hasEmails ? (
                              <div className="flex items-center min-w-0">
                                <FaEnvelope className="mr-2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs sm:text-sm text-gray-900 truncate" title={item.emails[0]}>
                                    {truncateUrl(item.emails[0], 25)}
                                  </div>
                                  {emailCount > 1 && (
                                    <div className="text-xs text-gray-500 truncate">
                                      +{emailCount - 1} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <FaEnvelope className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="text-xs sm:text-sm">No emails</span>
                              </div>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-4 lg:px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2 justify-end">
                              <button
                                onClick={() => startAddEmail(item.uniqueId)}
                                className="text-teal-600 hover:text-teal-900 p-1"
                                title="Add email"
                              >
                                <FaPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(item.link_scraped, 'URL copied!')}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="Copy URL"
                              >
                                <FaCopy className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                onClick={() => deleteSource(item.uniqueId)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete source"
                              >
                                <FaTrash className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded row for emails list */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="px-3 sm:px-4 lg:px-6 py-3">
                              <div className="pl-8 sm:pl-10 lg:pl-12">
                                {/* Add email form */}
                                {isAddingEmail === item.uniqueId && (
                                  <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Enter email address"
                                        className="flex-1 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                        onKeyPress={(e) => e.key === 'Enter' && saveNewEmail(item.uniqueId)}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => saveNewEmail(item.uniqueId)}
                                          disabled={isSaving || !newEmail.trim()}
                                          className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-1 sm:flex-none"
                                        >
                                          {isSaving ? (
                                            <FaSpinner className="animate-spin h-3 w-3 sm:h-4 sm:w-4" />
                                          ) : (
                                            'Add'
                                          )}
                                        </button>
                                        <button
                                          onClick={cancelAddEmail}
                                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs sm:text-sm flex-1 sm:flex-none"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Emails list */}
                                {hasEmails ? (
                                  <div className="space-y-2">
                                    {item.emails.map((email, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                        <div className="flex items-center flex-1 min-w-0">
                                          <FaEnvelope className="mr-2 text-gray-400 h-3 w-3 flex-shrink-0" />
                                          <span className="text-xs sm:text-sm text-gray-900 truncate flex-1" title={email}>
                                            {email}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                          <button
                                            onClick={() => copyToClipboard(email, 'Email copied!')}
                                            className="text-blue-600 hover:text-blue-900 p-1"
                                            title="Copy email"
                                          >
                                            <FaCopy className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => deleteEmail(item.uniqueId, email)}
                                            className="text-red-600 hover:text-red-900 p-1"
                                            title="Delete email"
                                          >
                                            <FaTrash className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <FaEnvelope className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs sm:text-sm">No emails found for this source</p>
                                    {!isAddingEmail && (
                                      <button
                                        onClick={() => startAddEmail(item.uniqueId)}
                                        className="mt-2 px-3 py-1 text-teal-600 hover:text-teal-700 text-xs sm:text-sm"
                                      >
                                        + Add first email
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Add email button when not in add mode */}
                                {!isAddingEmail && hasEmails && (
                                  <div className="mt-3">
                                    <button
                                      onClick={() => startAddEmail(item.uniqueId)}
                                      className="flex items-center text-teal-600 hover:text-teal-700 text-xs sm:text-sm"
                                    >
                                      <FaPlus className="mr-1 h-3 w-3" />
                                      Add another email
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Info */}
          {filteredData.length > 0 && (
            <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm">
                <div className="text-gray-700 truncate">
                  Showing <span className="font-medium">{filteredData.length}</span> of{' '}
                  <span className="font-medium">{scrapedData.length}</span> sources
                </div>
                <div className="text-gray-700 truncate">
                  Total emails: <span className="font-medium">{countTotalEmails().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}