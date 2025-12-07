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
  FaInfoCircle
} from 'react-icons/fa'
import { FiRefreshCw } from 'react-icons/fi'
import { HiOutlineFire } from 'react-icons/hi'

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
        return <FaPlay className="h-3 w-3 text-green-600" />
      case 'paused':
        return <FaPause className="h-3 w-3 text-yellow-600" />
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
        {/* <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm">
              <FaRocket className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Outbound Campaigns</h1>
          </div>
          <p className="text-gray-600">
            Create and manage your email outreach campaigns
          </p>
        </div> */}
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOutbounds(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
          >
            <FaPlus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {outbounds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-xl border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-1">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{outbounds.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <FaRocket className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-1">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">
                  {outbounds.filter(o => o.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <FaPlay className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">
                  {outbounds.reduce((sum, o) => sum + (o.task_count || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaTasks className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Total Emails</p>
                <p className="text-3xl font-bold text-gray-900">
                  {outbounds.reduce((sum, o) => sum + (o.email_count || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaChartLine className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outbounds Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HiOutlineFire className="h-5 w-5 text-orange-600" />
              Your Campaigns
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {outbounds.length} campaign{outbounds.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {outbounds.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl mb-6">
              <FaRocket className="h-12 w-12 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No campaigns yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Launch your first email campaign to start reaching out to prospects and growing your business.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3.5 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
            >
              <FaPlus className="h-4 w-4" />
              Launch Your First Campaign
              <FaArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Campaign Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaTasks className="h-3.5 w-3.5" />
                      Tasks
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FaChartLine className="h-3.5 w-3.5" />
                      Emails
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
                {outbounds.map((outbound) => (
                  <tr key={outbound.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <Link
                          href={`/dashboard/outbounds/${outbound.id}`}
                          className="inline-flex items-center gap-2 group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center shadow-sm">
                            <FaRocket className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                              {outbound.name}
                              <FaExternalLinkAlt className="h-3 w-3 ml-2 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <FaCalendar className="h-3 w-3" />
                              Created {new Date(outbound.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {/* <div className="p-2 bg-blue-50 rounded-lg">
                          <FaTasks className="h-4 w-4 text-blue-600" />
                        </div> */}
                        <div>
                          <div className="font-bold text-gray-900">
                            {outbound.task_count || 0}
                          </div>
                          <div className="text-xs text-gray-500">Tasks</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {/* <div className="p-2 bg-purple-50 rounded-lg">
                          <FaChartLine className="h-4 w-4 text-purple-600" />
                        </div> */}
                        <div>
                          <div className="font-bold text-gray-900">
                            {outbound.email_count || 0}
                          </div>
                          <div className="text-xs text-gray-500">Emails</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(outbound.status)}`}>
                          {getStatusIcon(outbound.status)}
                          <span className="font-medium text-sm">
                            {getStatusText(outbound.status)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCreateTask(outbound)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                          title="Create Task"
                        >
                          <FaTasks className="h-3 w-3" />
                          Task
                        </button>
                        
                        <Link
                          href={`/dashboard/outbounds/${outbound.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm"
                          title="View Details"
                        >
                          <FaEdit className="h-3 w-3" />
                          Edit
                        </Link>
                        
                        <button
                          onClick={() => handleDeleteOutbound(outbound)}
                          disabled={deleting === outbound.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-medium rounded-lg hover:from-red-700 hover:to-pink-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Campaign"
                        >
                          {deleting === outbound.id ? (
                            <FiRefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <FaTrash className="h-3 w-3" />
                          )}
                          Delete
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
      {outbounds.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Campaign Management Tips</h4>
              <p className="text-sm text-gray-600">
                Create tasks for each campaign to organize your email sequences. Click on any campaign name to view detailed analytics, manage tasks, and edit campaign settings.
              </p>
            </div>
          </div>
        </div>
      )}

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