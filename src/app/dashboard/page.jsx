'use client'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    emailAccounts: 0,
    outbounds: 0,
    sentToday: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      fetchStats()
    }
  }, [user, authLoading])

  const fetchStats = async () => {
    try {
      // Fetch email accounts count
      const { count: emailCount } = await supabase
        .from('email_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch outbounds count
      const { count: outboundCount } = await supabase
        .from('outbounds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Count total emails sent today across all accounts
      // Get today's date range (start of day to end of day in UTC)
      const now = new Date()
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
      
      // Get all user's email account IDs
      const { data: userAccounts } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.id)

      const accountIds = (userAccounts || []).map(acc => acc.id)
      
      // Count emails sent today for all user's accounts
      let totalSentToday = 0
      if (accountIds.length > 0) {
        const { count } = await supabase
          .from('email_queue')
          .select('*', { count: 'exact', head: true })
          .in('account_id', accountIds)
          .eq('status', 'sent')
          .gte('sent_at', startOfToday.toISOString())
          .lte('sent_at', endOfToday.toISOString())
        
        totalSentToday = count || 0
      }

      setStats({
        emailAccounts: emailCount || 0,
        outbounds: outboundCount || 0,
        sentToday: totalSentToday || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while auth is being checked
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Your existing JSX remains the same */}
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-600">
            Manage your email accounts and create outbound campaigns from one place.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <span className="text-white text-2xl">📧</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Email Accounts
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.emailAccounts}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/dashboard/emails')}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Manage accounts →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <span className="text-white text-2xl">🚀</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Outbound Campaigns
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.outbounds}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/dashboard/outbounds')}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                View campaigns →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <span className="text-white text-2xl">📊</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Emails Sent Today
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.sentToday}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">
                Across all accounts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => router.push('/dashboard/emails')}
              className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                <span className="text-indigo-600 text-xl">➕</span>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Add Email Account
                </h4>
                <p className="text-sm text-gray-500">
                  Connect a new Gmail account
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/outbounds')}
              className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                <span className="text-green-600 text-xl">📤</span>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Create Campaign
                </h4>
                <p className="text-sm text-gray-500">
                  Start a new outbound campaign
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}