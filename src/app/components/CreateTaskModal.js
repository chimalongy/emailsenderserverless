'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'

export default function CreateTaskModal({ isOpen, onClose, onSuccess, outbound }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    type: 'new',
    subject: '',
    body: '',
    scheduled_at: '',
    send_rate: 5
  })
  const [validationError, setValidationError] = useState('')
  const [existingTasks, setExistingTasks] = useState(0)
  const [lastNewSubject, setLastNewSubject] = useState('')

  useEffect(() => {
    if (isOpen && outbound) {
      fetchEmailAccounts()
      fetchExistingTasks()
    }
  }, [isOpen, outbound])

  const fetchEmailAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)

      if (error) throw error
      setEmailAccounts(data || [])
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    }
  }

  const fetchExistingTasks = async () => {
    if (!outbound) return
    
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('outbound_id', outbound.id)

      if (error) throw error
      const totalTasks = count || 0
      setExistingTasks(totalTasks)

      // Fetch tasks to find the most recent "new" task for subject defaults
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, type, subject, scheduled_at, created_at')
        .eq('outbound_id', outbound.id)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      let latestNewSubject = ''
      if (tasksData && tasksData.length > 0) {
        const latestNewTask = tasksData.find(task => task.type === 'new')
        latestNewSubject = latestNewTask?.subject || ''
      }

      setLastNewSubject(latestNewSubject)

      const isFirstTask = totalTasks === 0
      const defaultType = isFirstTask ? 'new' : 'followup'

      // Auto-generate task name and default type/subject
      setFormData(prev => ({
        ...prev,
        name: `Task${totalTasks + 1}`,
        type: defaultType,
        subject: defaultType === 'followup' && latestNewSubject ? latestNewSubject : ''
      }))
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setValidationError('')

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Task name is required')
      }
      if (!formData.subject.trim()) {
        throw new Error('Email subject is required')
      }
      if (!formData.body.trim()) {
        throw new Error('Email body is required')
      }
      if (!formData.scheduled_at) {
        throw new Error('Scheduled date and time is required')
      }

      // Convert datetime-local to ISO string (UTC)
      // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
      // We need to convert it to UTC properly
      const localDate = new Date(formData.scheduled_at)
      if (isNaN(localDate.getTime())) {
        throw new Error('Invalid scheduled date and time')
      }
      
      // Convert to ISO string (UTC) - this ensures consistent timezone handling
      const scheduledAtISO = localDate.toISOString()
      
      if (localDate < new Date()) {
        throw new Error('Scheduled time must be in the future')
      }

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          outbound_id: outbound.id,
          name: formData.name,
          type: formData.type,
          subject: formData.subject,
          body: formData.body,
          scheduled_at: scheduledAtISO,
          send_rate: formData.send_rate,
          status: 'scheduled'
        })
        .select()
        .single()

      if (taskError) {
        throw new Error(taskError.message || 'Failed to create task')
      }

      /**
       * Build task-specific email_queue entries.
       *
       * Assumes the `outbounds` table has:
       * - email_list: text (same format as AddOutboundModal)
       * - allocations: jsonb (array in the same shape as AddOutboundModal.formData.allocations)
       *
       * Also assumes `email_queue` has a `task_id` column.
       */
      const { data: outboundConfig, error: outboundError } = await supabase
        .from('outbounds')
        .select('email_list, allocations')
        .eq('id', outbound.id)
        .single()

      if (outboundError) {
        throw new Error(outboundError.message || 'Failed to load outbound configuration')
      }

      const rawEmails = (outboundConfig?.email_list || '').split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const allocations = Array.isArray(outboundConfig?.allocations)
        ? outboundConfig.allocations
        : []

      if (rawEmails.length === 0 || allocations.length === 0) {
        throw new Error('This outbound does not have a saved recipient list and allocations. Please edit the outbound and save again.')
      }

      const emailQueueEntries = []
      let emailIndex = 0

      allocations.forEach(allocation => {
        const allocated = allocation.allocated_emails || 0
        for (let i = 0; i < allocated && emailIndex < rawEmails.length; i++) {
          emailQueueEntries.push({
            user_id: user.id,
            outbound_id: outbound.id,
            task_id: task.id,
            account_id: allocation.account_id,
            recipient: rawEmails[emailIndex],
            subject: formData.subject,
            body: formData.body,
            scheduled_at: scheduledAtISO,
            status: 'pending'
          })
          emailIndex++
        }
      })

      if (emailQueueEntries.length === 0) {
        throw new Error('No recipients could be generated for this task based on the outbound configuration.')
      }

      const { error: queueInsertError } = await supabase
        .from('email_queue')
        .insert(emailQueueEntries)

      if (queueInsertError) {
        throw new Error(queueInsertError.message || 'Failed to create email queue entries for this task')
      }

      // Schedule only the emails for this task
      await scheduleEmailSending(outbound.id, task.id)

      alert('Task created successfully! Emails will be sent at the scheduled time.')
      onSuccess()

    } catch (error) {
      console.error('Error creating task:', error)
      const message =
        error?.message ||
        error?.hint ||
        error?.details ||
        'An unknown error occurred while creating the task.'
      setValidationError(message)
    } finally {
      setLoading(false)
    }
  }

const scheduleEmailSending = async (outboundId, taskId) => {
  try {
    console.log('🚀 Scheduling emails via serverless QStash...')
    console.log('Outbound ID:', outboundId)
    console.log('Task ID:', taskId)
    
    // Get the scheduled_at from the task (it's already in ISO format/UTC)
    const { data: taskData, error: taskFetchError } = await supabase
      .from('tasks')
      .select('scheduled_at, send_rate')
      .eq('id', taskId)
      .single()
    
    if (taskFetchError || !taskData) {
      throw new Error('Failed to fetch task details for scheduling')
    }
    
    const scheduledAtISO = taskData.scheduled_at
    const sendRate = taskData.send_rate
    
    console.log('Scheduled at (UTC):', scheduledAtISO)
    console.log('Send rate:', sendRate)
    
    // Get the current session to pass the access token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session. Please log in again.')
    }
    
    const response = await fetch('/api/schedule-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        outbound_id: outboundId,
        task_id: taskId,
        scheduled_at: scheduledAtISO,
        send_rate: sendRate
      })
    })

    // Get the response text first to see what's coming back
    const responseText = await response.text()
    console.log('📨 Raw API response:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse API response:', parseError)
      throw new Error(`Invalid API response: ${responseText.substring(0, 100)}...`)
    }

    console.log('📊 Parsed API result:', result)

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}: Failed to schedule emails`)
    }

    if (!result.success) {
      // Build a detailed error message
      let errorMessage = result.error || 'Scheduling failed without specific error'
      
      // If there are specific errors, include them
      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.errors.slice(0, 3).join('; ') // Show first 3 errors
        errorMessage = `${errorMessage}. Details: ${errorDetails}`
        if (result.errors.length > 3) {
          errorMessage += ` (and ${result.errors.length - 3} more errors)`
        }
      }
      
      throw new Error(errorMessage)
    }

    console.log('✅ Emails scheduled successfully:', result)
    return result

  } catch (error) {
    console.error('❌ Error scheduling emails:', error)
    
    // More detailed error message
    const detailedError = new Error(`Failed to schedule emails: ${error.message}`)
    detailedError.originalError = error
    throw detailedError
  }
}

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'new',
      subject: '',
      body: '',
      scheduled_at: '',
      send_rate: 5
    })
    setValidationError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !outbound) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Create Task for {outbound.name}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          )}

          {/* Campaign Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Campaign Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Campaign:</span>
                <p className="font-medium">{outbound.name}</p>
              </div>
              <div>
                <span className="text-blue-600">Available Accounts:</span>
                <p className="font-medium">{emailAccounts.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Task1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    type: newType,
                    subject:
                      newType === 'followup'
                        ? (lastNewSubject || prev.subject)
                        : '' // Clear subject for new tasks
                  }))
                }}
              >
                <option value="new">New Emailing</option>
                <option value="followup" disabled={existingTasks === 0}>
                  Follow-up
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Subject *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Exciting opportunity for your business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body *
            </label>
            <textarea
              rows="8"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Write your email message here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              You can use variables like {`{name}`} for personalization (to be implemented)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sending Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sending Rate (seconds between emails) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.send_rate}
                onChange={(e) => setFormData({ ...formData, send_rate: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher rates prevent spam flags
              </p>
            </div>
          </div>

          {/* Email Accounts Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Accounts That Will Send
            </label>
            <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
              {emailAccounts.length === 0 ? (
                <p className="text-sm text-gray-500">No active email accounts found</p>
              ) : (
                <div className="space-y-1">
                  {emailAccounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{account.sender_name}</span>
                      <span className="text-gray-500 text-xs">{account.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating Task...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}