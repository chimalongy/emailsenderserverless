'use client'

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
  FaListAlt
} from 'react-icons/fa'
import Link from 'next/link'

export default function ScrapeDetailsPage() {
  const { scrape_id } = useParams()
  const id = scrape_id
  const router = useRouter()
  const { user } = useAuth()
  
  const [search, setSearch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState([])
  const [filteredEmails, setFilteredEmails] = useState([])
  const [selectedEmails, setSelectedEmails] = useState(new Set())
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)
  const [newEmail, setNewEmail] = useState({
    email: '',
    name: '',
    company: '',
    title: '',
    location: '',
    website: '',
    source: ''
  })
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [emailsToDelete, setEmailsToDelete] = useState([])
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
        
        // Parse emails from the emails array
        if (data.emails && data.emails.length > 0) {
          const parsedEmails = data.emails.map((email, index) => {
            let parsedEmail
            if (typeof email === 'string') {
              try {
                parsedEmail = JSON.parse(email)
              } catch {
                parsedEmail = { email }
              }
            } else {
              parsedEmail = email
            }
            return {
              id: `${data.id}-${index}`, // Create unique ID
              ...parsedEmail,
              created_at: parsedEmail.created_at || data.created_at,
              source: parsedEmail.source || data.method || 'scrape'
            }
          })
          setEmails(parsedEmails)
          setFilteredEmails(parsedEmails)
        }
      }
    } catch (error) {
      console.error('Error fetching search details:', error)
      setStatusMessage('Failed to load search details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, id])

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

  // Filter emails based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmails(emails)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = emails.filter(email => 
      email.email?.toLowerCase().includes(term) ||
      email.name?.toLowerCase().includes(term) ||
      email.company?.toLowerCase().includes(term) ||
      email.title?.toLowerCase().includes(term) ||
      email.location?.toLowerCase().includes(term) ||
      email.website?.toLowerCase().includes(term)
    )
    setFilteredEmails(filtered)
  }, [searchTerm, emails])

  // Sort emails
  useEffect(() => {
    const sorted = [...filteredEmails].sort((a, b) => {
      let aValue = a[sortBy] || ''
      let bValue = b[sortBy] || ''
      
      // Handle dates
      if (sortBy === 'created_at') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    setFilteredEmails(sorted)
  }, [sortBy, sortOrder])

  // Handle email selection
  const toggleEmailSelection = (emailId) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId)
    } else {
      newSelected.add(emailId)
    }
    setSelectedEmails(newSelected)
    setIsSelectAll(newSelected.size === filteredEmails.length)
  }

  const toggleSelectAll = () => {
    if (isSelectAll) {
      setSelectedEmails(new Set())
    } else {
      const allIds = filteredEmails.map(email => email.id)
      setSelectedEmails(new Set(allIds))
    }
    setIsSelectAll(!isSelectAll)
  }

  // Edit email
  const startEditEmail = (email) => {
    setIsEditing(true)
    setEditingEmail({ ...email })
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditingEmail(null)
  }

  const saveEmailEdit = async () => {
    if (!editingEmail || !editingEmail.email) {
      alert('Email is required')
      return
    }

    setIsSaving(true)
    try {
      const updatedEmails = emails.map(email => 
        email.id === editingEmail.id ? editingEmail : email
      )
      
      // Update in Supabase
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: updatedEmails.map(e => {
            const { id, ...rest } = e
            return rest
          })
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setEmails(updatedEmails)
      setIsEditing(false)
      setEditingEmail(null)
      setStatusMessage('Email updated successfully!')
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error saving email:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Add new email
  const startAddNewEmail = () => {
    setIsAddingNew(true)
    setNewEmail({
      email: '',
      name: '',
      company: '',
      title: '',
      location: '',
      website: '',
      source: 'manual'
    })
  }

  const cancelAddNew = () => {
    setIsAddingNew(false)
    setNewEmail({
      email: '',
      name: '',
      company: '',
      title: '',
      location: '',
      website: '',
      source: ''
    })
  }

  const saveNewEmail = async () => {
    if (!newEmail.email) {
      alert('Email is required')
      return
    }

    setIsSaving(true)
    try {
      const emailToAdd = {
        ...newEmail,
        created_at: new Date().toISOString(),
        id: `${search.id}-${Date.now()}` // Temporary ID
      }
      
      const updatedEmails = [...emails, emailToAdd]
      
      // Update in Supabase
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: updatedEmails.map(e => {
            const { id, ...rest } = e
            return rest
          })
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setEmails(updatedEmails)
      setIsAddingNew(false)
      setNewEmail({
        email: '',
        name: '',
        company: '',
        title: '',
        location: '',
        website: '',
        source: ''
      })
      setStatusMessage('Email added successfully!')
      
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error adding email:', error)
      alert('Failed to add email. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete emails
  const confirmDeleteSelected = () => {
    if (selectedEmails.size === 0) {
      alert('Please select emails to delete')
      return
    }
    setEmailsToDelete(Array.from(selectedEmails))
    setShowConfirmDelete(true)
  }

  const deleteEmails = async () => {
    setIsSaving(true)
    try {
      const updatedEmails = emails.filter(email => !emailsToDelete.includes(email.id))
      
      const { error } = await supabase
        .from('scrappings')
        .update({ 
          emails: updatedEmails.map(e => {
            const { id, ...rest } = e
            return rest
          })
        })
        .eq('id', search.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      setEmails(updatedEmails)
      setSelectedEmails(new Set())
      setIsSelectAll(false)
      setShowConfirmDelete(false)
      setStatusMessage(`Deleted ${emailsToDelete.length} email(s) successfully!`)
      
      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting emails:', error)
      alert('Failed to delete emails. Please try again.')
    } finally {
      setIsSaving(false)
      setEmailsToDelete([])
    }
  }

  // Copy email to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setStatusMessage('Copied to clipboard!')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  // Copy all emails to clipboard
  const copyAllEmails = () => {
    if (emails.length === 0) {
      alert('No emails to copy')
      return
    }
    
    const allEmails = emails.map(email => email.email).join('\n')
    copyToClipboard(allEmails)
  }

  // Copy selected emails to clipboard
  const copySelectedEmails = () => {
    if (selectedEmails.size === 0) {
      alert('Please select emails to copy')
      return
    }
    
    const selectedEmailsList = emails.filter(e => selectedEmails.has(e.id))
    const emailList = selectedEmailsList.map(e => e.email).join('\n')
    copyToClipboard(emailList)
  }

  // Download CSV
  const downloadCSV = () => {
    if (emails.length === 0) {
      alert('No emails to download')
      return
    }

    const headers = ['Email', 'Name', 'Company', 'Title', 'Location', 'Website', 'Source', 'Created At']
    const csvRows = emails.map(email => [
      email.email || '',
      email.name || '',
      email.company || '',
      email.title || '',
      email.location || '',
      email.website || '',
      email.source || '',
      email.created_at ? new Date(email.created_at).toLocaleString() : ''
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
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
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
          <div className="flex-1">
            <Link 
               href="/dashboard/scrape-emails" 
              className="inline-flex items-center text-teal-600 hover:text-teal-700 text-sm sm:text-base mb-2"
            >
              <FaArrowLeft className="mr-1 sm:mr-2" />
              Back to All Searches
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{search.name}</h1>
              <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(search.status)} self-start sm:self-auto`}>
                {search.status.charAt(0).toUpperCase() + search.status.slice(1)}
              </span>
            </div>
          </div>
          
          {statusMessage && (
            <div className="px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg text-xs sm:text-sm">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Search Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <div className="flex items-center text-gray-600 mb-1 sm:mb-2">
                <FaFileAlt className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">Search Method</span>
              </div>
              <p className="text-gray-900 capitalize text-sm sm:text-base">{search.method}</p>
            </div>
            
            <div>
              <div className="flex items-center text-gray-600 mb-1 sm:mb-2">
                <FaEnvelope className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">Emails Found</span>
              </div>
              <p className="text-gray-900 text-lg sm:text-xl font-semibold">{emails.length.toLocaleString()}</p>
            </div>
            
            <div>
              <div className="flex items-center text-gray-600 mb-1 sm:mb-2">
                <FaCalendarAlt className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">Created</span>
              </div>
              <p className="text-gray-900 text-xs sm:text-sm">{formatDate(search.created_at)}</p>
            </div>
            
            <div>
              <div className="flex items-center text-gray-600 mb-1 sm:mb-2">
                <FaCalendarAlt className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">Last Updated</span>
              </div>
              <p className="text-gray-900 text-xs sm:text-sm">{formatDate(search.updated_at)}</p>
            </div>
          </div>
          
          {/* Search Details */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Search Details</h3>
            {search.method === 'query' ? (
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Search Queries:</p>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {search.queries?.map((query, index) => (
                    <span key={index} className="px-2 sm:px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs">
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-gray-600">URLs to Process: <span className="font-medium">{search.urls?.length || 0} URLs</span></p>
                  <button
                    onClick={() => setShowUrls(!showUrls)}
                    className="flex items-center text-teal-600 hover:text-teal-700 text-xs sm:text-sm"
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
                
                {showUrls && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                      {search.urls?.map((url, index) => (
                        <div key={index} className="flex items-start">
                          <FaGlobe className="mt-0.5 mr-2 text-gray-400 flex-shrink-0 h-3 w-3" />
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-gray-900 hover:text-teal-600 break-all flex-1"
                            title={url}
                          >
                            <span className="truncate block sm:hidden">{truncateUrl(url, 40)}</span>
                            <span className="hidden sm:block">{truncateUrl(url, 70)}</span>
                          </a>
                          <button
                            onClick={() => copyToClipboard(url)}
                            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
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
            <div className="flex-1 w-full">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm w-full sm:w-auto"
              >
                <option value="created_at">Sort by Date</option>
                <option value="email">Sort by Email</option>
                <option value="name">Sort by Name</option>
                <option value="company">Sort by Company</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 whitespace-nowrap"
              >
                <FaFilter className="inline mr-1 h-3 w-3" />
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={downloadCSV}
                disabled={emails.length === 0}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center text-sm ${
                  emails.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <FaDownload className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              
              <button
                onClick={copyAllEmails}
                disabled={emails.length === 0}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center text-sm ${
                  emails.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <FaCopy className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Copy Emails</span>
                <span className="sm:hidden">Copy</span>
              </button>
              
              <button
                onClick={startAddNewEmail}
                className="px-3 sm:px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 flex items-center justify-center text-sm"
              >
                <FaPlus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Email</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
          
          {/* Selection Actions */}
          {selectedEmails.size > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center text-xs sm:text-sm text-gray-700 hover:text-gray-900 mr-3"
                  >
                    {isSelectAll ? (
                      <FaCheckSquare className="mr-1 sm:mr-2 text-teal-600 h-4 w-4" />
                    ) : (
                      <FaSquare className="mr-1 sm:mr-2 text-gray-400 h-4 w-4" />
                    )}
                    {selectedEmails.size} selected
                  </button>
                  
                  <button
                    onClick={copySelectedEmails}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-700 hover:text-gray-900 flex items-center"
                  >
                    <FaCopy className="mr-1 sm:mr-2 h-3 w-3" />
                    Copy Selected
                  </button>
                </div>
                
                <button
                  onClick={confirmDeleteSelected}
                  className="px-3 sm:px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center text-xs sm:text-sm whitespace-nowrap"
                >
                  <FaTrash className="mr-1 sm:mr-2 h-3 w-3" />
                  Delete Selected ({selectedEmails.size})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add New Email Form */}
        {isAddingNew && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Add New Email</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newEmail.email}
                  onChange={(e) => setNewEmail({...newEmail, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="example@company.com"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newEmail.name}
                  onChange={(e) => setNewEmail({...newEmail, name: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={newEmail.company}
                  onChange={(e) => setNewEmail({...newEmail, company: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Company Inc."
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newEmail.title}
                  onChange={(e) => setNewEmail({...newEmail, title: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="CEO"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEmail.location}
                  onChange={(e) => setNewEmail({...newEmail, location: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="New York, NY"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={newEmail.website}
                  onChange={(e) => setNewEmail({...newEmail, website: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://company.com"
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={cancelAddNew}
                className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm w-full sm:w-auto order-2 sm:order-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveNewEmail}
                className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center text-sm w-full sm:w-auto order-1 sm:order-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <FaSpinner className="animate-spin mr-1 sm:mr-2 h-4 w-4" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="mr-1 sm:mr-2 h-4 w-4" />
                    <span>Add Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Edit Email Form */}
        {isEditing && editingEmail && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Edit Email</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editingEmail.email}
                  onChange={(e) => setEditingEmail({...editingEmail, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingEmail.name || ''}
                  onChange={(e) => setEditingEmail({...editingEmail, name: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={editingEmail.company || ''}
                  onChange={(e) => setEditingEmail({...editingEmail, company: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingEmail.title || ''}
                  onChange={(e) => setEditingEmail({...editingEmail, title: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editingEmail.location || ''}
                  onChange={(e) => setEditingEmail({...editingEmail, location: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={editingEmail.website || ''}
                  onChange={(e) => setEditingEmail({...editingEmail, website: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={cancelEdit}
                className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm w-full sm:w-auto order-2 sm:order-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={saveEmailEdit}
                className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center text-sm w-full sm:w-auto order-1 sm:order-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <FaSpinner className="animate-spin mr-1 sm:mr-2 h-4 w-4" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="mr-1 sm:mr-2 h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Emails List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FaEnvelope className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">No emails found</h3>
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                {searchTerm ? 'Try a different search term' : 'Start by adding emails or wait for scraping to complete'}
              </p>
              {!searchTerm && (
                <button
                  onClick={startAddNewEmail}
                  className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 inline-flex items-center text-xs sm:text-sm"
                >
                  <FaPlus className="mr-1 sm:mr-2" />
                  Add Your First Email
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center focus:outline-none"
                      >
                        {isSelectAll ? (
                          <FaCheckSquare className="text-teal-600 h-4 w-4" />
                        ) : (
                          <FaSquare className="text-gray-400 h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Name
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Company
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Title
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                      Location
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmails.map((email) => (
                    <tr 
                      key={email.id}
                      className={`hover:bg-gray-50 ${
                        selectedEmails.has(email.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleEmailSelection(email.id)}
                          className="flex items-center focus:outline-none"
                        >
                          {selectedEmails.has(email.id) ? (
                            <FaCheckSquare className="text-teal-600 h-4 w-4" />
                          ) : (
                            <FaSquare className="text-gray-400 hover:text-gray-600 h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <div className="flex items-center">
                          <FaEnvelope className="mr-2 text-gray-400 flex-shrink-0 h-4 w-4" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none" title={email.email}>
                              {email.email}
                            </div>
                            {email.website && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <FaGlobe className="mr-1 h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[120px] sm:max-w-none" title={email.website}>
                                  {email.website}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(email.email)}
                            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                            title="Copy email"
                          >
                            <FaCopy className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                        {/* Mobile-only details */}
                        <div className="sm:hidden mt-2 space-y-1">
                          {email.name && (
                            <div className="flex items-center text-xs">
                              <FaUser className="mr-1 text-gray-400 h-3 w-3" />
                              <span className="text-gray-700">{email.name}</span>
                            </div>
                          )}
                          {email.company && (
                            <div className="flex items-center text-xs">
                              <FaBuilding className="mr-1 text-gray-400 h-3 w-3" />
                              <span className="text-gray-700">{email.company}</span>
                            </div>
                          )}
                          {email.title && (
                            <div className="text-xs text-gray-700">Title: {email.title}</div>
                          )}
                          {email.location && (
                            <div className="flex items-center text-xs">
                              <FaMapMarkerAlt className="mr-1 text-gray-400 h-3 w-3" />
                              <span className="text-gray-700">{email.location}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap hidden sm:table-cell">
                        {email.name ? (
                          <div className="flex items-center">
                            <FaUser className="mr-2 text-gray-400 h-4 w-4" />
                            <span className="text-sm text-gray-900">{email.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap hidden md:table-cell">
                        {email.company ? (
                          <div className="flex items-center">
                            <FaBuilding className="mr-2 text-gray-400 h-4 w-4" />
                            <span className="text-sm text-gray-900">{email.company}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap hidden lg:table-cell">
                        <span className="text-sm text-gray-900 truncate block max-w-[120px]" title={email.title || ''}>
                          {email.title || '-'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap hidden xl:table-cell">
                        {email.location ? (
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="mr-2 text-gray-400 h-4 w-4" />
                            <span className="text-sm text-gray-900">{email.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          email.source === 'manual' 
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {email.source || 'scrape'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => startEditEmail(email)}
                            className="text-teal-600 hover:text-teal-900"
                            title="Edit"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEmailsToDelete([email.id])
                              setShowConfirmDelete(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Info */}
          {filteredEmails.length > 0 && (
            <div className="px-3 sm:px-6 py-2 sm:py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredEmails.length}</span> of{' '}
                  <span className="font-medium">{emails.length}</span> emails
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  {selectedEmails.size > 0 && `${selectedEmails.size} selected`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2">
            <div className="flex items-center mb-3 sm:mb-4">
              <FaExclamationTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-2 sm:mr-3 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
              Are you sure you want to delete {emailsToDelete.length} email(s)? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowConfirmDelete(false)
                  setEmailsToDelete([])
                }}
                className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm w-full sm:w-auto order-2 sm:order-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={deleteEmails}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center text-sm w-full sm:w-auto order-1 sm:order-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <FaSpinner className="animate-spin mr-1 sm:mr-2 h-4 w-4" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FaTrash className="mr-1 sm:mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}