'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import AddEmailModal from '../../components/AddEmailModal'
import axios from 'axios'
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaGoogle,
  FaSync,
  FaEnvelope,
  FaUser,
  FaCalendarDay,
  FaPaperPlane,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
  FaChevronDown,
  FaChevronRight
} from 'react-icons/fa'
import { HiMail } from 'react-icons/hi'
import { FiRefreshCw } from 'react-icons/fi'
import { MdEmail, MdOutlineAttachEmail } from 'react-icons/md'

export default function EmailsPage() {
  const { user } = useAuth()
  const [emailAccounts, setEmailAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [connectingEmails, setConnectingEmails] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState(new Set())

  useEffect(() => {
    if (user) {
      fetchEmailAccounts()
    }
  }, [user])

  const fetchEmailAccounts = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    }
    
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get today's date range (start of day to end of day in UTC)
      const now = new Date()
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
      
      // For each account, count emails sent today from email_queue
      const accountsWithTodayCount = await Promise.all(
        (data || []).map(async (account) => {
          // Count emails sent today for this account
          const { count: sentTodayCount, error: countError } = await supabase
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .eq('status', 'sent')
            .gte('sent_at', startOfToday.toISOString())
            .lte('sent_at', endOfToday.toISOString())

          if (countError) {
            console.error(`Error counting emails for account ${account.id}:`, countError)
          }

          return {
            ...account,
            sent_today: sentTodayCount || 0,
            usage_percentage: Math.round(((sentTodayCount || 0) / account.daily_limit) * 100)
          }
        })
      )
      
      setEmailAccounts(accountsWithTodayCount)
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    } finally {
      setLoading(false)
      if (showRefresh) {
        setRefreshing(false)
      }
    }
  }

  const toggleAccount = (accountId) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this email account?\n\nThis action cannot be undone.')) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchEmailAccounts()
    } catch (error) {
      console.error('Error deleting email account:', error)
      alert('Error deleting email account')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (email) => {
    setEditingEmail(email)
    setShowAddModal(true)
  }

  const handleConnectGmail = async (account) => {
    setConnectingEmails(prev => ({ ...prev, [account.id]: true }))
    
    try {
      const response = await axios.get('/api/auth/gmail/connect', {
        params: {
          user_id: account.user_id,
          email_id: account.id,
        }
      })
      
      if (response.data.authUrl) {
        window.open(response.data.authUrl, '_blank')
      } else {
        throw new Error('Failed to get Google auth URL')
      }
    } catch (error) {
      console.error('Failed to connect Gmail:', error)
      alert(error.response?.data?.message || 'Failed to connect with Gmail. Please try again.')
    } finally {
      setConnectingEmails(prev => ({ ...prev, [account.id]: false }))
    }
  }

  const getStatusIcon = (active, usagePercentage) => {
    if (!active) {
      return <FaTimesCircle className="h-3 w-3" />
    }
    if (usagePercentage >= 90) {
      return <FaExclamationTriangle className="h-3 w-3" />
    }
    return <FaCheckCircle className="h-3 w-3" />
  }

  const getStatusColor = (active, usagePercentage) => {
    if (!active) return 'bg-red-50 text-red-700 border-red-100'
    if (usagePercentage >= 100) return 'bg-red-50 text-red-700 border-red-100'
    if (usagePercentage >= 90) return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }

  const getStatusText = (active, usagePercentage) => {
    if (!active) return 'Inactive'
    if (usagePercentage >= 100) return 'Limit Reached'
    if (usagePercentage >= 90) return 'Near Limit'
    return 'Active'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading email accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          {/* <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-sm">
              <MdOutlineAttachEmail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Email Accounts</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Manage and connect your Gmail accounts for automated email sending
              </p>
            </div>
          </div> */}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEmailAccounts(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 text-sm"
            title="Refresh"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh</span>
          </button>
          
          <button
            onClick={() => {
              setEditingEmail(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors text-sm"
          >
            <FaPlus className="h-4 w-4" />
            <span className="font-semibold">Add Email</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {emailAccounts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-teal-800 mb-1">Total Accounts</p>
                <p className="text-lg md:text-2xl font-bold text-gray-800">{emailAccounts.length}</p>
              </div>
              <div className="p-2 bg-white/50 rounded-lg">
                <FaEnvelope className="h-5 w-5 md:h-6 md:w-6 text-teal-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-emerald-800 mb-1">Active</p>
                <p className="text-lg md:text-2xl font-bold text-gray-800">
                  {emailAccounts.filter(acc => acc.active).length}
                </p>
              </div>
              <div className="p-2 bg-white/50 rounded-lg">
                <FaCheckCircle className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-amber-800 mb-1">Sent Today</p>
                <p className="text-lg md:text-2xl font-bold text-gray-800">
                  {emailAccounts.reduce((sum, acc) => sum + (acc.sent_today || 0), 0)}
                </p>
              </div>
              <div className="p-2 bg-white/50 rounded-lg">
                <FaPaperPlane className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-800 mb-1">Available</p>
                <p className="text-lg md:text-2xl font-bold text-gray-800">
                  {emailAccounts.reduce((sum, acc) => sum + (acc.daily_limit - (acc.sent_today || 0)), 0)}
                </p>
              </div>
              <div className="p-2 bg-white/50 rounded-lg">
                <FaCalendarDay className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Accounts List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <HiMail className="h-5 w-5 text-teal-600" />
              Your Email Accounts
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full self-start sm:self-auto">
              {emailAccounts.length} account{emailAccounts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {emailAccounts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-full mb-4">
              <MdEmail className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No email accounts yet
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Start by adding your first Gmail account to enable automated email sending.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              <span className="font-semibold">Add Email Account</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* Desktop View */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="col-span-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaUser className="h-3.5 w-3.5" />
                    Sender
                  </div>
                </div>
                <div className="col-span-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <HiMail className="h-3.5 w-3.5" />
                    Email Address
                  </div>
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FaCalendarDay className="h-3.5 w-3.5" />
                    Daily Limit
                  </div>
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </div>
                <div className="col-span-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </div>
              </div>
              
              {emailAccounts.map((account) => (
                <div key={account.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
                          <span className="text-sm font-bold text-teal-700">
                            {account.sender_name?.charAt(0).toUpperCase() || 'E'}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {account.sender_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Added {new Date(account.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-red-50 rounded-lg">
                          <FaGoogle className="h-3.5 w-3.5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">
                            {account.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-800">
                          {account.daily_limit} emails/day
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              account.usage_percentage >= 90 ? 'bg-red-500' : 
                              account.usage_percentage >= 70 ? 'bg-amber-500' : 
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(account.usage_percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(account.active, account.usage_percentage)}`}>
                            {getStatusIcon(account.active, account.usage_percentage)}
                            <span>{getStatusText(account.active, account.usage_percentage)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.sent_today || 0} / {account.daily_limit} sent
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit account"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleConnectGmail(account)}
                          disabled={connectingEmails[account.id]}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Connect Gmail"
                        >
                          {connectingEmails[account.id] ? (
                            <FaSync className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaGoogle className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={deletingId === account.id}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete account"
                        >
                          {deletingId === account.id ? (
                            <FaSync className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaTrash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View with Accordion - IMPROVED LAYOUT */}
            <div className="sm:hidden">
              {emailAccounts.map((account) => {
                const isExpanded = expandedAccounts.has(account.id)
                
                return (
                  <div key={account.id} className="border-b border-gray-200 last:border-b-0">
                    {/* Accordion Header - IMPROVED LAYOUT */}
                    <button
                      onClick={() => toggleAccount(account.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      {/* Left side: Chevron + Sender Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-1 rounded ${isExpanded ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                          {isExpanded ? (
                            <FaChevronDown className="h-3 w-3" />
                          ) : (
                            <FaChevronRight className="h-3 w-3" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-teal-700">
                              {account.sender_name?.charAt(0).toUpperCase() || 'E'}
                            </span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-800 text-sm truncate">
                              {account.sender_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {account.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side: Status badge */}
                      <div className="flex-shrink-0 ml-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(account.active, account.usage_percentage)}`}>
                          {getStatusIcon(account.active, account.usage_percentage)}
                          <span className="hidden xs:inline">{getStatusText(account.active, account.usage_percentage)}</span>
                          <span className="xs:hidden">•</span>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-0.5">
                          {account.sent_today || 0}/{account.daily_limit}
                        </div>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="space-y-4">
                          {/* Usage Progress */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Daily Usage</span>
                                <span className="text-xs font-medium text-gray-800">
                                  {account.usage_percentage}% used
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    account.usage_percentage >= 90 ? 'bg-red-500' : 
                                    account.usage_percentage >= 70 ? 'bg-amber-500' : 
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(account.usage_percentage, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 text-center">
                                {account.sent_today || 0} of {account.daily_limit} emails sent today
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => handleConnectGmail(account)}
                                disabled={connectingEmails[account.id]}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                {connectingEmails[account.id] ? (
                                  <FaSync className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FaGoogle className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">Connect</span>
                              </button>
                              
                              <button
                                onClick={() => handleEdit(account)}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                              >
                                <FaEdit className="h-4 w-4" />
                                <span className="text-sm font-medium">Edit</span>
                              </button>
                              
                              <button
                                onClick={() => handleDelete(account.id)}
                                disabled={deletingId === account.id}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                {deletingId === account.id ? (
                                  <FaSync className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FaTrash className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">Delete</span>
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                              <span>Gmail Account</span>
                              <span>Created {new Date(account.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Helper Note */}
      {/* {emailAccounts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1 text-sm">Getting Started with Gmail</h4>
              <p className="text-sm text-gray-600">
                Click the Connect button for each account to authorize with Gmail's API.
                Each account needs to be connected individually to send emails.
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Add/Edit Email Modal */}
      <AddEmailModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingEmail(null)
        }}
        onSuccess={() => {
          setShowAddModal(false)
          setEditingEmail(null)
          fetchEmailAccounts()
        }}
        editingEmail={editingEmail}
      />
    </div>
  )
}