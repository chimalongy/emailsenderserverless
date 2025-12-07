import React, { useState, useEffect, useRef } from 'react'

export default function ReplyModal({ isOpen, onClose, reply, onSendReply }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)
  const textareaRef = useRef(null)

  const extractName = (emailString) => {
    if (!emailString) return ''
    const match = emailString.match(/^([^<]+)/)
    return match ? match[1].trim() : emailString.split('@')[0]
  }

  const getOriginalText = () => {
    if (reply?.plainText) return reply.plainText
    if (reply?.snippet) return reply.snippet
    if (reply?.htmlText) {
      return reply.htmlText.replace(/<[^>]+>/g, '').trim()
    }
    return ''
  }

  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setError('')
      setCharCount(0)
      setShowOriginal(false)
      
      // Auto-focus textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    setCharCount(message.length)
  }, [message])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])


  function extractEmail(str) {
    const emailRegex = /<([^>]+)>/;   // captures the email inside <...>
  
    const match = str.match(emailRegex);
  
    if (match && match[1]) {
      return match[1].trim();
    }
  
    return null; // if no email found
  }

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Message cannot be empty')
      textareaRef.current?.focus()
      return
    }

    if (message.trim().length < 10) {
      setError('Message seems too short. Please add more content.')
      textareaRef.current?.focus()
      return
    }

    setSending(true)
    setError('')

    let recipient = extractEmail(reply?.fromEmail|| reply?.from)
    let account_email =extractEmail(reply?.fromEmail|| reply?.to)

    if (!recipient || recipient==null){
        setError(err.message || 'Invalid recipient')
    }

    try {
        console.log("REPLY ")
        console.log(reply)
      await onSendReply({
        replyId: reply?.id || reply?.messageId,
        to: recipient,
        inReplyTo:reply.inReplyTo,
        accountEmail:account_email,
        subject: `Re: ${reply?.subject?.replace(/^(Re:\s*)+/i, '') || 'Your message'}`,
        body: message
      })
      
      //Success feedback
     setMessage('')
     onClose()
    } catch (err) {
      console.error('Failed to send reply:', err)
      setError(err.message || 'Failed to send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setError('')
    textareaRef.current?.focus()
  }

  const handleShowOriginal = () => {
    setShowOriginal(!showOriginal)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Reply to {extractName(reply?.from || '')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {reply?.from || reply?.fromEmail}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                disabled={sending}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">
            {/* Message Editor */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Your reply
                </label>
                <span className={`text-sm ${charCount > 1000 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {charCount} characters
                </span>
              </div>
              <textarea
                ref={textareaRef}
                className="w-full border border-gray-300 rounded-lg p-3 h-64 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-sans text-gray-700 leading-relaxed bg-white text-gray-900"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your reply here..."
              />
            </div>

            {/* Show Original Checkbox - Now below the textarea */}
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={showOriginal}
                  onChange={handleShowOriginal}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show original message</span>
              </label>
            </div>

            {/* Original Message Display */}
            {showOriginal && reply && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Original Message</h4>
                  <p className="text-xs text-gray-500">
                    From: {reply?.from || reply?.fromEmail}
                    {reply?.date && ` • ${new Date(reply.date).toLocaleString()}`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                    {getOriginalText() || 'No original message available'}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                  disabled={sending || !message.trim()}
                >
                  Clear
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                  disabled={sending}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}