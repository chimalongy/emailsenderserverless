'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import AddOutboundModal from '../../components/AddOutboundModal'
import CreateTaskModal from '../../components/CreateTaskModal'
import {
  FaPlus,
  FaTrash,
  FaTasks,
  FaCalendar,
  FaChartLine,
  FaPlay,
  FaPause,
  FaEdit,
  FaRocket,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaExternalLinkAlt,
  FaInfoCircle,
  // FaSparkles,
  FaFolder,
  FaEnvelope
} from 'react-icons/fa'
import { FiRefreshCw } from 'react-icons/fi'
import { HiOutlineFire, HiOutlineTrendingUp } from 'react-icons/hi'
import { TbMailForward } from 'react-icons/tb'

export default function OutboundsPage() {
  const { user } = useAuth()
  const [outbounds, setOutbounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedOutbound, setSelectedOutbound] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchOutbounds()
    }
  }, [user])

  const fetchOutbounds = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true)
    }
    
    try {
      const { data, error } = await supabase
        .from('outbounds')
        .select(`
          *,
          tasks (count),
          email_queue (count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Process data to include counts
      const processedOutbounds = (data || []).map(outbound => ({
        ...outbound,
        task_count: outbound.tasks?.[0]?.count || 0,
        email_count: outbound.email_queue?.[0]?.count || 0
      }))
      
      setOutbounds(processedOutbounds)
    } catch (error) {
      console.error('Error fetching outbounds:', error)
    } finally {
      setLoading(false)
      if (showRefresh) {
        setRefreshing(false)
      }
    }
  }

  const handleCreateTask = (outbound) => {
    setSelectedOutbound(outbound)
    setShowTaskModal(true)
  }

  const handleDeleteOutbound = async (outbound) => {
    if (!confirm(`Are you sure you want to delete the campaign "${outbound.name}"? This action cannot be undone and will also delete all associated tasks and email queue entries.`)) {
      return
    }

    setDeleting(outbound.id)
    
    try {
      // First, delete associated email queue entries
      const { error: queueError } = await supabase
        .from('email_queue')
        .delete()
        .eq('outbound_id', outbound.id)
        .eq('user_id', user.id)

      if (queueError) {
        console.error('Error deleting email queue entries:', queueError)
      }

      // Then delete associated tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('outbound_id', outbound.id)

      if (tasksError) {
        console.error('Error deleting tasks:', tasksError)
      }

      // Finally delete the outbound campaign
      const { error: outboundError } = await supabase
        .from('outbounds')
        .delete()
        .eq('id', outbound.id)
        .eq('user_id', user.id)

      if (outboundError) throw outboundError

      fetchOutbounds()
      
    } catch (error) {
      console.error('Error deleting outbound:', error)
      alert('Failed to delete campaign: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <FaPlay className="h-3 w-3 text-emerald-600" />
      case 'paused':
        return <FaPause className="h-3 w-3 text-amber-600" />
      case 'completed':
        return <FaCheckCircle className="h-3 w-3 text-blue-600" />
      default:
        return <FaClock className="h-3 w-3 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'paused':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'paused':
        return 'Paused'
      case 'completed':
        return 'Completed'
      default:
        return 'Draft'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-[3px] border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 blur-lg opacity-30 rounded-xl"></div>
              <div className="relative p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <TbMailForward className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Outbound Campaigns</h1>
              <p className="text-gray-600 mt-1.5">
                Create and manage your email outreach campaigns
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOutbounds(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50 hover:shadow-md active:scale-95"
            title="Refresh"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline font-medium">Refresh</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <FaPlus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
            <span className="font-semibold">New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Summary - 2 columns on mobile, 3 on desktop */}
      {outbounds.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-700 mb-1 sm:mb-2 flex items-center gap-2">
                  <FaRocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Total Campaigns</span>
                  <span className="xs:hidden">Campaigns</span>
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{outbounds.length}</p>
                <p className="text-xs text-orange-600 mt-1 sm:mt-2 hidden sm:block">
                  Manage all your outreach campaigns
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-white/50 rounded-lg sm:rounded-xl">
                <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg shadow-inner">
                  <FaRocket className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1 sm:mb-2 flex items-center gap-2">
                  <FaTasks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Total Tasks</span>
                  <span className="xs:hidden">Tasks</span>
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  {outbounds.reduce((sum, o) => sum + (o.task_count || 0), 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1 sm:mt-2 hidden sm:block">
                  Scheduled sending tasks
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-white/50 rounded-lg sm:rounded-xl">
                <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shadow-inner">
                  <FaTasks className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-700 mb-1 sm:mb-2 flex items-center gap-2">
                  <FaEnvelope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Total Emails</span>
                  <span className="xs:hidden">Emails</span>
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  {outbounds.reduce((sum, o) => sum + (o.email_count || 0), 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1 sm:mt-2 hidden sm:block">
                  Emails in all campaigns
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-white/50 rounded-lg sm:rounded-xl">
                <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg shadow-inner">
                  <FaEnvelope className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outbounds Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
                  <HiOutlineFire className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
                <span>Your Campaigns</span>
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Create, manage, and monitor your email campaigns
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs sm:text-sm font-medium rounded-full border border-gray-200">
                <FaFolder className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-2" />
                {outbounds.length} campaign{outbounds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        {outbounds.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl mb-6 sm:mb-8 shadow-inner">
              <div className="p-4 sm:p-6 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl">
                <TbMailForward className="h-8 w-8 sm:h-12 sm:w-12 text-orange-500" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Launch Your First Campaign
            </h3>
            <p className="text-gray-500 mb-8 sm:mb-10 max-w-md mx-auto text-sm sm:text-lg">
              Start reaching out to prospects and grow your business with targeted email campaigns.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-xl hover:shadow-2xl active:scale-95 group"
            >
              <FaPlus className="h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-90 transition-transform" />
              <span className="font-bold text-sm sm:text-lg">Create New Campaign</span>
              <FaArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
                <div className="text-center p-3 sm:p-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl mb-3 sm:mb-4">
                    <FaTasks className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">Create Tasks</h4>
                  <p className="text-xs sm:text-sm text-gray-500">Schedule automated sending sequences</p>
                </div>
                <div className="text-center p-3 sm:p-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl mb-3 sm:mb-4">
                    <FaChartLine className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">Track Performance</h4>
                  <p className="text-xs sm:text-sm text-gray-500">Monitor opens, clicks, and replies</p>
                </div>
                <div className="text-center p-3 sm:p-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl mb-3 sm:mb-4">
                    {/* <FaSparkles className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" /> */}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">Scale Outreach</h4>
                  <p className="text-xs sm:text-sm text-gray-500">Reach more prospects with automation</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] sm:min-w-0">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <TbMailForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Campaign Details</span>
                      <span className="xs:hidden">Campaign</span>
                    </div>
                  </th>
                  <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaTasks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Tasks</span>
                    </div>
                  </th>
                  <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Emails</span>
                    </div>
                  </th>
                  <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outbounds.map((outbound) => (
                  <tr key={outbound.id} className="hover:bg-gray-50/80 transition-all duration-200 group">
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <Link
                        href={`/dashboard/outbounds/${outbound.id}`}
                        className="flex items-start gap-3 sm:gap-4 group-hover:translate-x-1 transition-transform"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 blur-md opacity-20 rounded-lg sm:rounded-xl"></div>
                          <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                            <TbMailForward className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate text-sm sm:text-base">
                              {outbound.name}
                            </h3>
                            <FaExternalLinkAlt className="h-3 w-3 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <FaCalendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>
                                {new Date(outbound.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block"></div>
                            <div className="flex items-center gap-1.5">
                              <HiOutlineTrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden xs:inline">ID: {outbound.id.slice(0, 8)}</span>
                              <span className="xs:hidden">ID: {outbound.id.slice(0, 6)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                          <FaTasks className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-lg sm:text-2xl font-bold text-gray-900">
                            {outbound.task_count || 0}
                          </div>
                          <div className="text-xs font-medium text-gray-500">Tasks</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                          <FaEnvelope className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-lg sm:text-2xl font-bold text-gray-900">
                            {outbound.email_count || 0}
                          </div>
                          <div className="text-xs font-medium text-gray-500">Emails</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border ${getStatusColor(outbound.status)}`}>
                        {getStatusIcon(outbound.status)}
                        <span className="font-semibold text-xs sm:text-sm">
                          {getStatusText(outbound.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => handleCreateTask(outbound)}
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                          title="Create Task"
                        >
                          <FaTasks className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden xs:inline">Task</span>
                        </button>
                        
                        <Link
                          href={`/dashboard/outbounds/${outbound.id}`}
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all shadow-md hover:shadow-lg active:scale-95"
                          title="View Details"
                        >
                          <FaEdit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden xs:inline">Edit</span>
                        </Link>
                        
                        <button
                          onClick={() => handleDeleteOutbound(outbound)}
                          disabled={deleting === outbound.id}
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-red-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Campaign"
                        >
                          {deleting === outbound.id ? (
                            <FiRefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                          ) : (
                            <FaTrash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                          <span className="hidden xs:inline">Delete</span>
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

      {/* Modals */}
      <AddOutboundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchOutbounds()
        }}
      />

      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false)
          setSelectedOutbound(null)
        }}
        onSuccess={() => {
          setShowTaskModal(false)
          setSelectedOutbound(null)
        }}
        outbound={selectedOutbound}
      />
    </div>
  )
}