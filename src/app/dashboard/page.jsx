'use client'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  FaEnvelope, 
  FaPaperPlane, 
  FaChartLine, 
  FaPlus, 
  FaRocket,
  FaArrowRight,
  FaChevronRight,
  FaExternalLinkAlt
} from 'react-icons/fa'
import { FiRefreshCw } from 'react-icons/fi'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    emailAccounts: 0,
    outbounds: 0,
    sentToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      fetchStats()
    }
  }, [user, authLoading])

  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    }
    
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
      if (showRefresh) {
        setRefreshing(false)
      }
    }
  }

  // Show loading while auth is being checked
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user.name || user.email.split('@')[0]}!</h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's what's happening with your email campaigns
          </p>
        </div>
        
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 text-sm self-start sm:self-auto"
          title="Refresh stats"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="font-medium">Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email Accounts Card */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-5 rounded-lg border border-teal-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-teal-800 mb-1">Email Accounts</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.emailAccounts}
              </p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <FaEnvelope className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/emails')}
            className="w-full flex items-center justify-between p-2.5 mt-3 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors group"
          >
            <span>Manage Accounts</span>
            <FaArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Campaigns Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Campaigns</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.outbounds}
              </p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <FaPaperPlane className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/outbounds')}
            className="w-full flex items-center justify-between p-2.5 mt-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors group"
          >
            <span>View Campaigns</span>
            <FaArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Emails Sent Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-purple-800 mb-1">Emails Sent Today</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.sentToday}
              </p>
            </div>
            <div className="p-3 bg-white/50 rounded-lg">
              <FaChartLine className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-3">
            Across all connected accounts
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaRocket className="h-5 w-5 text-teal-600" />
            Quick Actions
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Get started with these common tasks
          </p>
        </div>
        
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add Email Account */}
            <button
              onClick={() => router.push('/dashboard/emails')}
              className="group flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="p-3 bg-teal-50 rounded-lg mr-4 group-hover:bg-teal-100 transition-colors">
                <FaPlus className="h-5 w-5 text-teal-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-800 text-sm">Add Email Account</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Connect a new Gmail account to send emails
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-teal-600 text-xs font-medium">Get Started</span>
                  <FaChevronRight className="h-3 w-3 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Create Campaign */}
            <button
              onClick={() => router.push('/dashboard/outbounds')}
              className="group flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="p-3 bg-blue-50 rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
                <FaPaperPlane className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-800 text-sm">Create Campaign</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Launch a new email outreach campaign
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-blue-600 text-xs font-medium">Start Campaign</span>
                  <FaChevronRight className="h-3 w-3 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      {(stats.emailAccounts === 0 || stats.outbounds === 0) && (
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <FaRocket className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800 text-sm mb-1">Get Started with MailFlow</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats.emailAccounts === 0 && (
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-teal-500 rounded-full"></div>
                    <span>Add your first email account to start sending</span>
                  </li>
                )}
                {stats.outbounds === 0 && (
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                    <span>Create your first campaign to reach your audience</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-purple-500 rounded-full"></div>
                  <span>Monitor your sending activity in real-time</span>
                </li>
              </ul>
              <div className="flex gap-3 mt-4">
                {stats.emailAccounts === 0 && (
                  <button
                    onClick={() => router.push('/dashboard/emails')}
                    className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Add Email Account
                  </button>
                )}
                {stats.outbounds === 0 && (
                  <button
                    onClick={() => router.push('/dashboard/outbounds')}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Campaign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}