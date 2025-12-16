'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import ReplyModal from './components/ReplyModal'

export default function OutboundRepliesPage() {
  const params = useParams()
  const router = useRouter()
  const outboundId = params?.id

  const [allReplies, setAllReplies] = useState([])
  const [filteredReplies, setFilteredReplies] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [showRawData, setShowRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState(null)
  const [deletedEmailList, setDeletedEmailList] = useState([])
  const [replyModal, setReplyModal] = useState({
    isOpen: false,
    reply: null
  })

  useEffect(() => {
    if (outboundId) {
      loadRecentReplies()
    }
  }, [outboundId])

  useEffect(() => {
    filterReplies()
  }, [allReplies, deletedEmailList])

  const filterReplies = () => {
    if (allReplies.length === 0) {
      setFilteredReplies([])
      return
    }

    const filtered = allReplies.filter(reply => {
      const fromEmail = extractEmail(reply?.from || reply?.fromEmail || '')
      const isBounceEmail = fromEmail.includes('mailer-daemon') || 
                           fromEmail.includes('mailer@') ||
                           fromEmail.includes('postmaster') ||
                           reply?.from?.toLowerCase().includes('mail delivery')
      
      if (isBounceEmail) {
        const recipientEmail = extractEmailFromBounceBody(reply) || reply.receiver
        if (recipientEmail) {
          return !deletedEmailList.includes(recipientEmail.toLowerCase())
        }
        return true
      } else {
        return !deletedEmailList.includes(fromEmail.toLowerCase())
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
          sinceDays: 30,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to load replies')
      }
      
      setAllReplies(result.replies || [])
      setMeta(result.meta || null)
      
      let deletedEmails = []
      try {
        deletedEmails = (result.deleted_emails || '')
          .split('\n')
          .map(email => email.trim())
          .filter(email => email.length > 0 && email.includes('@'))
      } catch (err) {
        console.error('Error parsing deleted emails:', err)
        deletedEmails = []
      }
      
      setDeletedEmailList(deletedEmails)
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

      toast.success('Reply sent successfully!')
      
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply: ' + err.message)
      throw err
    }
  }

  const extractEmailFromBounceBody = (reply) => {
    if (reply.receiver) {
      return reply.receiver
    }
    
    if (reply.plainText) {
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
    e.stopPropagation()
    
    try {
      const reply = allReplies.find(r => {
        const replyIdToCheck = r.id || r.messageId
        return replyIdToCheck === replyId
      })
      
      let emailToDelete = email
      
      const fromEmail = extractEmail(reply?.from || reply?.fromEmail || '')
      const isMailerDaemon = fromEmail.includes('mailer-daemon') || 
                            fromEmail.includes('mailer@') ||
                            fromEmail.includes('postmaster') ||
                            reply?.from?.toLowerCase().includes('mail delivery') ||
                            reply?.subject?.toLowerCase().includes('delivery status')
      
      if (isMailerDaemon && reply) {
        const extractedEmail = extractEmailFromBounceBody(reply)
        
        if (extractedEmail) {
          emailToDelete = extractedEmail
        } else if (reply.receiver) {
          emailToDelete = reply.receiver
        }
      }
      
      if (!confirm(`Delete ${emailToDelete} from your email list?`)) {
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

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

      const rawEmails = (outboundData.email_list || '').split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0)

      if (!rawEmails.includes(emailToDelete)) {
        toast.error('Email not found in the recipient list')
        return
      }

      const updatedEmails = rawEmails.filter(e => e !== emailToDelete)

      const deletedEmails = (outboundData.deleted_emails || '').split('\n')
        .map(e => e.trim())
        .filter(e => e.length > 0)
      
      if (!deletedEmails.includes(emailToDelete)) {
        deletedEmails.push(emailToDelete)
      }

      const allocations = Array.isArray(outboundData.allocations) ? outboundData.allocations : []
      
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

      const newAllocations = allocations.map(allocation => {
        if (allocation.account_id === accountIdWithDeletedEmail) {
          return {
            account_id: allocation.account_id,
            allocated_emails: Math.max(0, (allocation.allocated_emails || 0) - 1)
          }
        }
        return allocation
      }).filter(alloc => alloc.allocated_emails > 0)

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

      setDeletedEmailList(prev => {
        if (!prev.includes(emailToDelete)) {
          return [...prev, emailToDelete]
        }
        return prev
      })

      toast.success(`${emailToDelete} has been removed`)
      
    } catch (err) {
      console.error('Error deleting email:', err)
      toast.error('Failed to delete email: ' + (err.message || 'Unknown error'))
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
    if (reply?.plainText) {
      return reply.plainText.trim()
    }
    if (reply?.htmlText) {
      const plain = reply.htmlText.replace(/<[^>]+>/g, '').trim()
      if (plain) return plain
    }
    if (reply?.snippet) {
      return reply.snippet
    }
    if (reply?.fullBody) {
      const plainTextMatch = reply.fullBody.match(/--- text\/plain ---\n([\s\S]*?)\n\n--- text\/html ---/)
      if (plainTextMatch && plainTextMatch[1]) {
        return plainTextMatch[1].trim()
      }
    }
    return 'No preview available.'
  }

  const extractEmail = (emailString) => {
    if (!emailString) return ''
    const match = emailString.match(/<([^>]+)>/)
    return match ? match[1] : emailString
  }

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

  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-3 px-2 py-3 max-w-7xl mx-auto sm:px-4">
      {/* Header - Mobile Optimized */}
      <div className="mb-3">
        <button
          onClick={() => router.push(`/dashboard/outbounds/${outboundId}`)}
          className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900 mb-2 group"
        >
          <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Campaign
        </button>
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Campaign Replies</h1>
            <p className="text-xs text-gray-500">
              View and manage replies
            </p>
          </div>
          <button
            onClick={loadRecentReplies}
            disabled={loading}
            className="inline-flex items-center justify-center px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Replies
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State - Mobile Optimized */}
      {error && (
        <div className="bg-red-50 border-l-3 border-red-400 p-2.5 rounded">
          <div className="flex">
            <svg className="h-4 w-4 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-medium text-sm">Error loading replies</p>
              <p className="text-red-700 text-xs break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Mobile Optimized */}
      {filteredReplies.length === 0 && !loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-6 px-3">
          <div className="mx-auto w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100">
            <svg className="h-5 w-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No replies yet</h3>
          <p className="mt-1 text-xs text-gray-500">
            Click the button above to fetch replies
          </p>
        </div>
      )}

      {/* Stats & Meta Info - Mobile Optimized */}
      {filteredReplies.length > 0 && meta && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{filteredReplies.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Replies</p>
              <p className="text-lg font-bold text-emerald-600">
                {filteredReplies.filter(r => getReplyType(r) === 'reply').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Bounces</p>
              <p className="text-lg font-bold text-red-600">
                {filteredReplies.filter(r => getReplyType(r) === 'bounce').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Deleted</p>
              <p className="text-lg font-bold text-gray-900">{deletedEmailList.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Replies Accordion - Mobile Optimized */}
      {filteredReplies.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">All Replies</h2>
            <p className="text-xs text-gray-500">
              {filteredReplies.length} replies from last 30 days
            </p>
          </div>
          
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
                  {/* Accordion Header - Mobile Optimized */}
                  <div
                    onClick={() => toggleAccordion(replyId)}
                    className="w-full p-2.5 text-left hover:bg-gray-50 cursor-pointer"
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
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {truncateText(subject, 50)}
                          </h3>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
                              replyType === 'bounce'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {replyType === 'bounce' ? 'Bounce' : 'Reply'}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="truncate" title={fromName || fromEmail}>
                              {fromName || fromEmail}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate" title={toEmail}>{toEmail}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs">{formatDate(reply.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => handleDeleteFromList(fromEmail, replyId, e)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete from email list"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        
                        <svg
                          className={`w-4 h-4 text-gray-400 transform transition-transform ${
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
                  
                  {/* Accordion Content - Mobile Optimized */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-2 border-t border-gray-200">
                      <div className="space-y-3">
                        {/* Email Body */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-2">Message</h4>
                          <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {getBodyPreview(reply)}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          {replyType !== 'bounce' && (
                            <button
                              onClick={(e) => handleReply(reply, e)}
                              className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Reply
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => toggleRawData(replyId, e)}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            {showRawData[replyId] ? 'Hide Raw' : 'Show Raw'}
                          </button>
                        </div>
                        
                        {/* Raw Data */}
                        {showRawData[replyId] && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Raw Data</h4>
                            <div className="bg-gray-900 rounded-lg p-2 overflow-auto">
                              <pre className="text-xs text-gray-300 font-mono">
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