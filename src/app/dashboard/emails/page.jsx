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
  FaArrowRight
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
      return <FaTimesCircle className="text-red-500 mr-2" />
    }
    if (usagePercentage >= 90) {
      return <FaExclamationTriangle className="text-yellow-500 mr-2" />
    }
    return <FaCheckCircle className="text-green-500 mr-2" />
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
          <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading email accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {/* <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
              <MdOutlineAttachEmail className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Email Accounts</h1>
          </div> */}
          <p className="text-gray-600">
            Manage and connect your Gmail accounts for automated email sending
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmailAccounts(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={() => {
              setEditingEmail(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
          >
            <FaPlus className="h-4 w-4" />
            <span>Add Email</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {emailAccounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{emailAccounts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaEnvelope className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-1">Active Accounts</p>
                <p className="text-3xl font-bold text-gray-900">
                  {emailAccounts.filter(acc => acc.active).length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <FaCheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">Total Sent Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {emailAccounts.reduce((sum, acc) => sum + (acc.sent_today || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <FaPaperPlane className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Available Capacity</p>
                <p className="text-3xl font-bold text-gray-900">
                  {emailAccounts.reduce((sum, acc) => sum + (acc.daily_limit - (acc.sent_today || 0)), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaCalendarDay className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Accounts Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HiMail className="h-5 w-5 text-indigo-600" />
              Your Email Accounts
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {emailAccounts.length} account{emailAccounts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {emailAccounts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl mb-6">
              <MdEmail className="h-12 w-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No email accounts yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start by adding your first Gmail account to enable automated email sending.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3.5 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <FaPlus className="h-4 w-4" />
              Add Your First Email Account
              <FaArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaUser className="h-3.5 w-3.5" />
                      Sender
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <HiMail className="h-3.5 w-3.5" />
                      Email Address
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaCalendarDay className="h-3.5 w-3.5" />
                      Daily Limit
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaPaperPlane className="h-3.5 w-3.5" />
                      Usage
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {emailAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                          <span className="text-lg font-bold text-indigo-700">
                            {account.sender_name?.charAt(0).toUpperCase() || 'E'}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {account.sender_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Added {new Date(account.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <FaGoogle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.email}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Gmail Account
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-900">
                          {account.daily_limit} emails/day
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-300 ${
                              account.usage_percentage >= 90 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                : account.usage_percentage >= 70 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500' 
                                : 'bg-gradient-to-r from-emerald-500 to-green-500'
                            }`}
                            style={{ width: `${Math.min(account.usage_percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-bold text-gray-900">
                            {account.sent_today || 0}
                          </div>
                          <span className="text-gray-400">/</span>
                          <div className="text-gray-900">{account.daily_limit}</div>
                        </div>
                        <div className="text-xs font-medium px-2 py-1 rounded-full w-fit" style={{
                          backgroundColor: account.usage_percentage >= 90 
                            ? '#FEF3C7' 
                            : account.usage_percentage >= 70 
                            ? '#FEFCE8' 
                            : '#ECFDF5',
                          color: account.usage_percentage >= 90 
                            ? '#92400E' 
                            : account.usage_percentage >= 70 
                            ? '#854D0E' 
                            : '#065F46'
                        }}>
                          {account.usage_percentage}% used
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                          !account.active 
                            ? 'bg-red-50 text-red-700' 
                            : account.usage_percentage >= 100 
                            ? 'bg-red-50 text-red-700' 
                            : account.usage_percentage >= 90 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {getStatusIcon(account.active, account.usage_percentage)}
                          <span className="font-medium text-sm">
                            {getStatusText(account.active, account.usage_percentage)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-2.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Edit account"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleConnectGmail(account)}
                          disabled={connectingEmails[account.id]}
                          className="p-2.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete account"
                        >
                          {deletingId === account.id ? (
                            <FaSync className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaTrash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helper Note */}
      {emailAccounts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Getting Started with Gmail</h4>
              <p className="text-sm text-gray-600">
                For each email account, click the <FaGoogle className="h-3 w-3 inline mx-1" /> Google icon to connect it with Gmail's API. 
                This authorization is required to send emails. Each account needs to be connected individually.
              </p>
            </div>
          </div>
        </div>
      )}

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