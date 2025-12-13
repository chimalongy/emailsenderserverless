'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiUser,
  FiKey,
  FiBarChart2,
  FiEdit3,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiHelpCircle,
  FiShield
} from 'react-icons/fi'
import { HiOutlineDocumentText, HiOutlineExclamationCircle } from 'react-icons/hi'
import { RiLoader4Line } from 'react-icons/ri'

export default function AddEmailModal({ isOpen, onClose, onSuccess, editingEmail }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    sender_name: '',
    email: '',
    app_password: '',
    daily_limit: 100,
    signature: ''
  })
  const [errors, setErrors] = useState({})

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
    setErrors({})
    setShowPassword(false)
  }, [editingEmail, isOpen])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.sender_name.trim()) {
      newErrors.sender_name = 'Sender name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!editingEmail && !formData.app_password) {
      newErrors.app_password = 'App password is required'
    }
    
    if (formData.daily_limit < 1 || formData.daily_limit > 500) {
      newErrors.daily_limit = 'Daily limit must be between 1 and 500'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
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
          setErrors({ 
            ...errors, 
            app_password: testResult.message || 'Could not send test email. Please check your app password.' 
          })
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
          setErrors({ 
            ...errors, 
            app_password: testResult.message || 'Could not send test email. Please check your app password.' 
          })
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
      setErrors({ 
        ...errors, 
        submit: 'Error saving email account: ' + error.message 
      })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg">
              {editingEmail ? (
                <FiEdit3 className="h-6 w-6 text-teal-600" />
              ) : (
                <FiMail className="h-6 w-6 text-teal-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {editingEmail ? 'Edit Email Account' : 'Add New Email Account'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {editingEmail 
                  ? 'Update your email account details' 
                  : 'Connect your email to start sending campaigns'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sender Name */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                <FiUser className="mr-2 h-4 w-4 text-teal-600" />
                Sender Name
              </label>
              <input
                type="text"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.sender_name 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                }`}
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                placeholder="John Doe"
              />
              {errors.sender_name && (
                <p className="flex items-center mt-2 text-sm text-red-600">
                  <HiOutlineExclamationCircle className="mr-1 h-4 w-4" />
                  {errors.sender_name}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                <FiMail className="mr-2 h-4 w-4 text-teal-600" />
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={!!editingEmail}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-100 ${
                  errors.email 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="flex items-center mt-2 text-sm text-red-600">
                  <HiOutlineExclamationCircle className="mr-1 h-4 w-4" />
                  {errors.email}
                </p>
              )}
              {editingEmail && (
                <p className="text-xs text-gray-500 mt-2">
                  <FiAlertCircle className="inline mr-1 h-3 w-3" />
                  Email address cannot be changed for existing accounts
                </p>
              )}
            </div>

            {/* App Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center text-sm font-semibold text-gray-900">
                  <FiKey className="mr-2 h-4 w-4 text-teal-600" />
                  App Password
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-teal-600 hover:text-teal-700 flex items-center"
                  >
                    {showPassword ? (
                      <>
                        <FiEyeOff className="mr-1 h-3 w-3" />
                        Hide
                      </>
                    ) : (
                      <>
                        <FiEye className="mr-1 h-3 w-3" />
                        Show
                      </>
                    )}
                  </button>
                  <a
                    href="https://support.google.com/accounts/answer/185833"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                    title="How to get app password"
                  >
                    <FiHelpCircle className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!editingEmail}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors pr-12 ${
                    errors.app_password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                  }`}
                  value={formData.app_password}
                  onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
                  placeholder={editingEmail ? "Enter new password to update" : "Your Gmail app password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.app_password && (
                <p className="flex items-center mt-2 text-sm text-red-600">
                  <HiOutlineExclamationCircle className="mr-1 h-4 w-4" />
                  {errors.app_password}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <FiShield className="inline mr-1 h-3 w-3" />
                {editingEmail 
                  ? 'Leave blank to keep current password. A test email will be sent if you update it.' 
                  : 'Generate from Google Account → Security → App passwords'}
              </p>
            </div>

            {/* Daily Limit */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                <FiBarChart2 className="mr-2 h-4 w-4 text-teal-600" />
                Daily Sending Limit
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="1"
                  className="flex-1 h-2 bg-gradient-to-r from-teal-200 to-teal-400 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                  value={formData.daily_limit}
                  onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                />
                <div className="w-24">
                  <input
                    type="number"
                    required
                    min="1"
                    max="500"
                    className={`w-full px-3 py-2 border rounded-lg text-center font-semibold ${
                      errors.daily_limit 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                    }`}
                    value={formData.daily_limit}
                    onChange={handleNumberChange}
                  />
                </div>
              </div>
              {errors.daily_limit && (
                <p className="flex items-center mt-2 text-sm text-red-600">
                  <HiOutlineExclamationCircle className="mr-1 h-4 w-4" />
                  {errors.daily_limit}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Maximum number of emails this account can send per day
              </p>
            </div>

            {/* Signature */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                <HiOutlineDocumentText className="mr-2 h-4 w-4 text-teal-600" />
                Email Signature
              </label>
              <textarea
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                placeholder="Best regards,&#10;John Doe&#10;CEO at Example Corp"
              />
              <p className="text-xs text-gray-500 mt-2">
                This signature will be automatically appended to all emails sent from this account
              </p>
            </div>

            {/* Form-level error */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                <p className="flex items-center text-sm text-red-600">
                  <HiOutlineExclamationCircle className="mr-2 h-4 w-4" />
                  {errors.submit}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {testingEmail ? (
                <div className="flex items-center">
                  <RiLoader4Line className="animate-spin h-4 w-4 text-teal-600 mr-2" />
                  Sending test email to verify credentials...
                </div>
              ) : (
                <div className="flex items-center">
                  <FiCheck className="mr-2 h-4 w-4 text-emerald-500" />
                  {editingEmail ? 'Your changes will be saved immediately' : 'Account will be verified before saving'}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || testingEmail}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center shadow-sm hover:shadow"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingEmail ? 'Updating...' : 'Creating...'}
                  </>
                ) : testingEmail ? (
                  'Testing...'
                ) : editingEmail ? (
                  <>
                    <FiCheck className="mr-2 h-4 w-4" />
                    Update Account
                  </>
                ) : (
                  <>
                    <FiMail className="mr-2 h-4 w-4" />
                    Add Email Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}