'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import AddEmailModal from '../../components/AddEmailModal'
import axios from 'axios'

export default function EmailsPage() {
  const { user } = useAuth()
  const [emailAccounts, setEmailAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmail, setEditingEmail] = useState(null)

  useEffect(() => {
    if (user) {
      fetchEmailAccounts()
    }
  }, [user])



  const fetchEmailAccounts = async () => {
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

          // Return account with actual sent_today count from today
          return {
            ...account,
            sent_today: sentTodayCount || 0
          }
        })
      )
      
      setEmailAccounts(accountsWithTodayCount)
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this email account?')) return

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
    }
  }

  const handleEdit = (email) => {
    setEditingEmail(email)
    setShowAddModal(true)
  }

  // 🔥 NEW: Connect Gmail
  const handleConnectGmail = async (account) => {
    console.log(account)

     // setConnectingEmails(prev => ({ ...prev, [email.id]: true }));
    
    const requestBody = {
       user_id: account.user_id,
       email_id:account.id,

    };

    try {
      const response = await axios.get('/api/auth/gmail/connect', {
        params: requestBody
      });
      
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('Failed to get Google auth URL');
      }
    } catch (error) {
      //toast.error(error.response?.data?.message || 'Failed to reconnect with Gmail');
    } finally {
     //setConnectingEmails(prev => ({ ...prev, [email.id]: false }));
    }


  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Accounts</h1>
          <p className="text-gray-600 mt-1">
            Manage your Gmail accounts for sending emails
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmail(null)
            setShowAddModal(true)
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Add New Email
        </button>
      </div>

      {/* Email Accounts Table */}
      <div className="bg-white shadow rounded-lg">
        {emailAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No email accounts yet
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by adding your first Gmail account.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Your First Email
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daily Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emailAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.sender_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.daily_limit} emails/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.sent_today || 0} sent
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* 🔥 ACTIONS COLUMN */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-4">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>

                      {/* 🔥 NEW CONNECT GMAIL BUTTON */}
                      <button
                        onClick={() => handleConnectGmail(account)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Connect Gmail
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
