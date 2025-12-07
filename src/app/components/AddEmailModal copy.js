'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

export default function AddEmailModal({ isOpen, onClose, onSuccess, editingEmail }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [formData, setFormData] = useState({
    sender_name: '',
    email: '',
    app_password: '',
    daily_limit: 100,
    signature: ''
  })

  useEffect(() => {
    if (editingEmail) {
      setFormData({
        sender_name: editingEmail.sender_name || '',
        email: editingEmail.email || '',
        app_password: '', // Don't show existing password
        daily_limit: editingEmail.daily_limit || 100,
        signature: editingEmail.signature || ''
      })
    } else {
      setFormData({
        sender_name: '',
        email: '',
        app_password: '',
        daily_limit: 100,
        signature: ''
      })
    }
  }, [editingEmail])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // For new emails, test the app password by sending a test email
      if (!editingEmail) {
        setTestingEmail(true)
        // Send test email to verify app password works
        const testResponse = await fetch('/api/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            app_password: formData.app_password,
            sender_name: formData.sender_name
          })
        })

        const testResult = await testResponse.json()
        setTestingEmail(false)

        if (!testResult.success) {
          // Test email failed - don't save the account
          alert(testResult.message || 'Could not send test email. Please check your app password and try again.')
          setLoading(false)
          return
        }

        // Test email succeeded - proceed to save
      } else if (formData.app_password) {
        // For editing, only test if app password is being updated
        setTestingEmail(true)
        const testResponse = await fetch('/api/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: editingEmail.email,
            app_password: formData.app_password,
            sender_name: formData.sender_name
          })
        })

        const testResult = await testResponse.json()
        setTestingEmail(false)

        if (!testResult.success) {
          // Test email failed - don't update the account
          alert(testResult.message || 'Could not send test email. Please check your app password and try again.')
          setLoading(false)
          return
        }
      }

      // Test passed (or not needed for edit without password change) - save the account
      if (editingEmail) {
        // Update existing email
        const { error } = await supabase
          .from('email_accounts')
          .update({
            sender_name: formData.sender_name,
            daily_limit: formData.daily_limit,
            signature: formData.signature,
            ...(formData.app_password && { app_password: formData.app_password }) // Only update password if provided
          })
          .eq('id', editingEmail.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new email
        const { error } = await supabase
          .from('email_accounts')
          .insert({
            user_id: user.id,
            sender_name: formData.sender_name,
            email: formData.email,
            app_password: formData.app_password,
            daily_limit: formData.daily_limit,
            signature: formData.signature,
            active: true
          })

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving email account:', error)
      alert('Error saving email account: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNumberChange = (e) => {
    const value = e.target.value;
    // Convert to number, but if empty string, use default
    const numValue = value === '' ? 100 : parseInt(value, 10);
    setFormData({ ...formData, daily_limit: isNaN(numValue) ? 100 : numValue });
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">
            {editingEmail ? 'Edit Email Account' : 'Add New Email Account'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sender Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.sender_name}
              onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={!!editingEmail}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Password
            </label>
            <input
              type="password"
              required={!editingEmail}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.app_password}
              onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
              placeholder="Your Gmail app password"
            />
            <p className="text-xs text-gray-500 mt-1">
              {editingEmail 
                ? 'Leave blank to keep current password. If updating, a test email will be sent to verify.' 
                : 'Get this from Google Account settings. A test email will be sent to verify your credentials.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Sending Limit
            </label>
            <input
              type="number"
              required
              min="1"
              max="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.daily_limit}
              onChange={handleNumberChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signature
            </label>
            <textarea
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.signature}
              onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
              placeholder="Best regards,&#10;John Doe"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {testingEmail 
                ? 'Sending Test Email...' 
                : loading 
                  ? (editingEmail ? 'Updating...' : 'Saving...') 
                  : editingEmail 
                    ? 'Update' 
                    : 'Add Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}