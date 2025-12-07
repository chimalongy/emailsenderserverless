'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import ReplyModal from './components/ReplyModal' // Adjust path as needed

export default function OutboundRepliesPage() {
  const params = useParams()
  const router = useRouter()
  const outboundId = params?.id

  const [allReplies, setAllReplies] = useState([]) // Store all replies from API
  const [filteredReplies, setFilteredReplies] = useState([]) // Store filtered replies for display
  const [expandedId, setExpandedId] = useState(null)
  const [showRawData, setShowRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sinceDays, setSinceDays] = useState(30)
  const [meta, setMeta] = useState(null)
  const [deletedEmailList, setDeletedEmailList] = useState([])
  const [replyModal, setReplyModal] = useState({
    isOpen: false,
    reply: null
  })

  // Load replies on component mount if outboundId exists
  useEffect(() => {
    if (outboundId) {
      loadRecentReplies()
    }
  }, [outboundId])

  // Filter replies whenever deletedEmailList or allReplies changes
  useEffect(() => {
    filterReplies()
  }, [allReplies, deletedEmailList])

  const filterReplies = () => {
    if (allReplies.length === 0) {
      setFilteredReplies([])
      return
    }

    const filtered = allReplies.filter(reply => {
      // Check if this is a bounce/delivery failure from mailer-daemon/postmaster
      const fromEmail = extractEmail(reply?.from || reply?.fromEmail || '')
      const isBounceEmail = fromEmail.includes('mailer-daemon') || 
                           fromEmail.includes('mailer@') ||
                           fromEmail.includes('postmaster') ||
                           reply?.from?.toLowerCase().includes('mail delivery')
      
      if (isBounceEmail) {
        // For bounce emails, check if the recipient email is in deleted list
        const recipientEmail = extractEmailFromBounceBody(reply) || reply.receiver
        if (recipientEmail) {
          // Only show bounce if recipient email is NOT in deleted list
          return !deletedEmailList.includes(recipientEmail)
        }
        // If we can't extract recipient email, show it (better to show than hide)
        return true
      } else {
        // For regular replies, check if sender email is in deleted list
        return !deletedEmailList.includes(fromEmail)
      }
    })

    setFilteredReplies(filtered)
  }

  const loadRecentReplies = async () => {
    if (!outboundId) {
      setError('Outbound ID is missing. Please navigate back and select a campaign again.')
      return
    }

    setLoading(true)
    setError('')
    setExpandedId(null)
    setShowRawData({})

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch('/api/replies/get-outbound-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          outboundId,
          sinceDays,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load replies')
      }
      
      setAllReplies(result.replies || [])
      setMeta(result.meta || null)
      
      // Parse deleted emails (standardize on newline-separated format)
      let deletedEmails = [];
      try {
        deletedEmails = (result.deleted_emails || '')
          .split('\n')
          .map(email => email.trim())
          .filter(email => email.length > 0 && email.includes('@'));
      } catch (err) {
        console.error('Error parsing deleted emails:', err);
        deletedEmails = [];
      }
      
      setDeletedEmailList(deletedEmails);
      console.log('Deleted emails loaded:', deletedEmails);

    } catch (err) {
      console.error('Error loading replies:', err)
      setError(err.message || 'Failed to load replies')
      setAllReplies([])
      setFilteredReplies([])
      setMeta(null)
      setDeletedEmailList([])
    } finally {
      setLoading(false)
    }
  }

  const toggleAccordion = (replyId) => {
    setExpandedId(expandedId === replyId ? null : replyId)
    // Clear raw data view when collapsing
    if (expandedId === replyId) {
      const newShowRawData = { ...showRawData }
      delete newShowRawData[replyId]
      setShowRawData(newShowRawData)
    }
  }

  const toggleRawData = (replyId, e) => {
    e.stopPropagation()
    setShowRawData(prev => ({
      ...prev,
      [replyId]: !prev[replyId]
    }))
  }
  
  const handleReply = (reply, e) => {
    e.stopPropagation()
    setReplyModal({
      isOpen: true,
      reply
    })
  }
 
  const handleSendReply = async (replyData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      console.log(replyData)
      // Call your API to send the reply
      const response = await fetch('/api/replies/send-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          outboundId,
          ...replyData
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send reply')
      }

      // Optional: Show success notification or update UI
      console.log('Reply sent successfully:', result)
      
    } catch (err) {
      console.error('Error sending reply:', err)
      throw err
    }
  }

  // Helper function to extract email from bounce/delivery failure body
  const extractEmailFromBounceBody = (reply) => {
    // First, check if there's a receiver field (already extracted in API)
    if (reply.receiver) {
      return reply.receiver
    }
    
    // Try to extract from plainText
    if (reply.plainText) {
      // Look for patterns like "wasn't delivered to [email]" or "to [email]"
      const patterns = [
        /wasn't delivered to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+because/i,
        /Final-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i
      ]
      
      for (const pattern of patterns) {
        const match = reply.plainText.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
    }
    
    // Try to extract from htmlText
    if (reply.htmlText) {
      const patterns = [
        /<b>([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})<\/b>/i,
        />([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})</i
      ]
      
      for (const pattern of patterns) {
        const match = reply.htmlText.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
    }
    
    // Try to extract from fullBody
    if (reply.fullBody) {
      const plainTextMatch = reply.fullBody.match(/--- text\/plain ---\n([\s\S]*?)\n\n--- text\/html ---/)
      if (plainTextMatch && plainTextMatch[1]) {
        const plainText = plainTextMatch[1]
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
        const match = plainText.match(emailPattern)
        if (match) {
          return match[0]
        }
      }
    }
    
    return null
  }

  const handleDeleteFromList = async (email, replyId, e) => {
    console.log("Original email to delete:", email)
    e.stopPropagation()
    
    try {
      // First, find the reply in the replies array to access its full data
      const reply = allReplies.find(r => {
        const replyIdToCheck = r.id || r.messageId
        return replyIdToCheck === replyId
      })
      
      let emailToDelete = email
      
      // Check if this is a bounce/delivery failure from mailer-daemon
      const fromEmail = extractEmail(reply?.from || reply?.fromEmail || '')
      const isMailerDaemon = fromEmail.includes('mailer-daemon') || 
                            fromEmail.includes('mailer@') ||
                            fromEmail.includes('postmaster') ||
                            reply?.from?.toLowerCase().includes('mail delivery') ||
                            reply?.subject?.toLowerCase().includes('delivery status')
      
      // If it's a bounce, extract email from body instead
      if (isMailerDaemon && reply) {
        console.log("Detected bounce/delivery failure email. Extracting recipient from body...")
        
        // Try to extract email from the body content
        const extractedEmail = extractEmailFromBounceBody(reply)
        
        if (extractedEmail) {
          emailToDelete = extractedEmail
          console.log("Extracted email from bounce body:", emailToDelete)
        } else {
          // If we can't extract from body, try to get from reply.receiver field
          if (reply.receiver) {
            emailToDelete = reply.receiver
            console.log("Using receiver field from bounce:", emailToDelete)
          } else {
            console.warn("Could not extract email from bounce body. Using original email:", email)
          }
        }
      }
      
      if (!confirm(`Are you sure you want to delete ${emailToDelete} from your email list? This will remove this recipient from future tasks.`)) {
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      // Fetch current outbound data
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbounds')
        .select('email_list, deleted_emails, allocations')
        .eq('id', outboundId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (outboundError) throw outboundError
      if (!outboundData) {
        throw new Error('Outbound not found')
      }

      // Parse email list
      const rawEmails = (outboundData.email_list || '').split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0)

      // Check if email exists in the list
      if (!rawEmails.includes(emailToDelete)) {
        toast.error('Email not found in the recipient list')
        return
      }

      // Remove email from active list
      const updatedEmails = rawEmails.filter(e => e !== emailToDelete)

      // Add to deleted emails
      const deletedEmails = (outboundData.deleted_emails || '').split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0)
      
      if (!deletedEmails.includes(emailToDelete)) {
        deletedEmails.push(emailToDelete)
      }

      // Find which account this email was allocated to (if any)
      const allocations = Array.isArray(outboundData.allocations) ? outboundData.allocations : []
      
      // Rebuild email list with allocations to find which account had this email
      let emailIndex = 0
      let accountIdWithDeletedEmail = null
      
      for (const allocation of allocations) {
        const allocated = allocation.allocated_emails || 0
        for (let i = 0; i < allocated && emailIndex < rawEmails.length; i++) {
          if (rawEmails[emailIndex] === emailToDelete) {
            accountIdWithDeletedEmail = allocation.account_id
            break
          }
          emailIndex++
        }
        if (accountIdWithDeletedEmail) break
      }

      // Update allocations: reduce count for the account that had this email
      const newAllocations = allocations.map(allocation => {
        if (allocation.account_id === accountIdWithDeletedEmail) {
          return {
            account_id: allocation.account_id,
            allocated_emails: Math.max(0, (allocation.allocated_emails || 0) - 1)
          }
        }
        return allocation
      }).filter(alloc => alloc.allocated_emails > 0)

      // Update outbound in database
      const { error: updateError } = await supabase
        .from('outbounds')
        .update({
          email_list: updatedEmails.join('\n'),
          deleted_emails: deletedEmails.join('\n'),
          allocations: newAllocations
        })
        .eq('id', outboundId)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // Add email to deleted list in state
      setDeletedEmailList(prev => {
        if (!prev.includes(emailToDelete)) {
          return [...prev, emailToDelete]
        }
        return prev
      })

      toast.success(`${emailToDelete} has been removed from the email list`)
      
    } catch (err) {
      console.error('Error deleting email:', err)
      toast.error('Failed to delete email from list: ' + (err.message || 'Unknown error'))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBodyPreview = (reply) => {
    // Check for plainText first (new structure)
    if (reply?.plainText) {
      return reply.plainText.trim()
    }
    // Check for htmlText (new structure)
    if (reply?.htmlText) {
      const plain = reply.htmlText.replace(/<[^>]+>/g, '').trim()
      if (plain) return plain
    }
    // Check for snippet (old structure)
    if (reply?.snippet) {
      return reply.snippet
    }
    // Check for fullBody (new structure)
    if (reply?.fullBody) {
      // Extract plain text from fullBody if possible
      const plainTextMatch = reply.fullBody.match(/--- text\/plain ---\n([\s\S]*?)\n\n--- text\/html ---/)
      if (plainTextMatch && plainTextMatch[1]) {
        return plainTextMatch[1].trim()
      }
    }
    return 'No preview available.'
  }

  // Helper function to extract email from "Name <email>" format
  const extractEmail = (emailString) => {
    if (!emailString) return ''
    const match = emailString.match(/<([^>]+)>/)
    return match ? match[1] : emailString
  }

  // Helper function to extract name from "Name <email>" format
  const extractName = (emailString) => {
    if (!emailString) return ''
    const match = emailString.match(/^([^<]+)/)
    return match ? match[1].trim() : ''
  }

  const getReplyType = (reply) => {
    const fromEmail = extractEmail(reply?.from || reply?.fromEmail || '')
    const isBounce = fromEmail.includes('mailer-daemon') || 
                     fromEmail.includes('mailer@') ||
                     fromEmail.includes('postmaster') ||
                     reply?.from?.toLowerCase().includes('mail delivery') ||
                     reply?.subject?.toLowerCase().includes('delivery status') ||
                     reply?.subject?.toLowerCase().includes('failure')
    
    return isBounce ? 'bounce' : 'reply'
  }

  const handleSinceDaysChange = (event) => {
    const value = parseInt(event.target.value, 10)
    if (Number.isNaN(value)) {
      setSinceDays(30)
      return
    }
    const clamped = Math.min(Math.max(value, 1), 120)
    setSinceDays(clamped)
  }

  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/outbounds/${outboundId}`)}
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 mb-4 group"
        >
          <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Outbound
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Replies</h1>
        <p className="text-gray-500 mt-1">
          View and manage replies for this campaign
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-64 text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lookback window (days)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={sinceDays}
                onChange={handleSinceDaysChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Check Gmail for replies within this timeframe
              </p>
            </div>

            <button
              onClick={loadRecentReplies}
              disabled={loading}
              className="inline-flex justify-center items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading replies...
                </>
              ) : (
                'Load replies'
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {filteredReplies.length === 0 && !loading ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No replies loaded yet</h3>
              <p className="mt-1 text-gray-500">
                Click the button above to fetch replies from Gmail
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Stats & Meta Info */}
      {filteredReplies.length > 0 && meta && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">Total Replies</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredReplies.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Filtered from {allReplies.length} total replies
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Lookback Period</p>
              <p className="text-2xl font-semibold text-gray-900">{meta.sinceDays} days</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-500">Deleted Emails</p>
              <p className="text-2xl font-semibold text-gray-900">{deletedEmailList.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Replies Accordion */}
      {filteredReplies.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredReplies.map((reply) => {
              const replyId = reply.id || reply.messageId
              const isExpanded = expandedId === replyId
              const fromEmail = extractEmail(reply.from || reply.fromEmail || '')
              const fromName = extractName(reply.from || reply.fromName || '')
              const toEmail = reply.to || reply.toEmail || ''
              const replyType = getReplyType(reply)
              const subject = reply.subject || '(no subject)'
              
              return (
                <li key={replyId} className="border-b border-gray-200 last:border-b-0">
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleAccordion(replyId)}
                    className="w-full p-6 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleAccordion(replyId)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {truncateText(subject, 60)}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                              replyType === 'bounce'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {replyType === 'bounce' ? 'Bounce' : 'Reply'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <span className="truncate">
                              {fromName || fromEmail}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{toEmail}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(reply.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                        {/* Delete button */}
                        <span onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDeleteFromList(fromEmail, replyId, e)}
                            className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:text-red-600"
                            title="Delete from email list"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </span>
                        
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 animate-slideDown">
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        {/* Email Body */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                              {getBodyPreview(reply)}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-3">
                          {replyType !== 'bounce' && (
                            <button
                              onClick={(e) => handleReply(reply, e)}
                              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Reply
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => toggleRawData(replyId, e)}
                            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            {showRawData[replyId] ? 'Hide Raw Data' : 'Show Raw Data'}
                          </button>
                        </div>
                        
                        {/* Raw Data */}
                        {showRawData[replyId] && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Email Data</h4>
                            <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                              <pre className="text-sm text-gray-300 font-mono">
                                {JSON.stringify(reply, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={() => setReplyModal({ isOpen: false, reply: null })}
        reply={replyModal.reply}
        onSendReply={handleSendReply}
      />
    </div>
  )
}