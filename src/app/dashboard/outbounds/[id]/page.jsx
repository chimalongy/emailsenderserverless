'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import TaskDetailsModal from './components/TaskDetailsModal'
import CreateTaskModal from '../../../components/CreateTaskModal'

export default function OutboundDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const outboundId = params?.id

  const [outbound, setOutbound] = useState(null)
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTaskAllocations, setSelectedTaskAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [outboundStats, setOutboundStats] = useState({
    totalSent: 0,
    totalReplies: 0
  })

  // Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)

  useEffect(() => {
    if (!user || !outboundId) return
    fetchOutboundAndTasks()
    fetchOutboundStats()
  }, [user, outboundId])

  const fetchOutboundAndTasks = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch outbound
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbounds')
        .select('*')
        .eq('id', outboundId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (outboundError) throw outboundError
      if (!outboundData) {
        setError('Outbound not found or you do not have access to it.')
        setLoading(false)
        return
      }

      setOutbound(outboundData)

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('outbound_id', outboundId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      setTasks(tasksData || [])
    } catch (err) {
      console.error('Error loading outbound detail:', err)
      const message =
        err?.message ||
        err?.hint ||
        err?.details ||
        'Failed to load outbound details.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOutboundStats = async () => {
    try {
      // Get total emails sent for this outbound
      const { data: sentData, error: sentError } = await supabase
        .from('email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('outbound_id', outboundId)
        .eq('user_id', user.id)
        .eq('status', 'sent')

      if (sentError) throw sentError

      // Get total replies for this outbound
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('id', { count: 'exact', head: true })
        .eq('outbound_id', outboundId)
        .eq('user_id', user.id)

      if (repliesError) throw repliesError

      setOutboundStats({
        totalSent: sentData?.count || 0,
        totalReplies: repliesData?.count || 0
      })
    } catch (err) {
      console.error('Error fetching outbound stats:', err)
    }
  }

  const loadTaskWithAllocations = async (task) => {
    try {
      // Fetch allocations for this task
      const { data, error } = await supabase
        .from('email_queue')
        .select(`
          id,
          status,
          account_id,
          email_accounts (
            sender_name,
            email
          )
        `)
        .eq('task_id', task.id)
        .eq('user_id', user.id)

      if (error) throw error

      const byAccount = new Map()

      ;(data || []).forEach((row) => {
        const key = row.account_id || 'unknown'
        const existing = byAccount.get(key) || {
          account_id: row.account_id,
          sender_name: row.email_accounts?.sender_name || 'Unknown',
          email: row.email_accounts?.email || '',
          total: 0,
          pending: 0,
          scheduled: 0,
          sent: 0,
          failed: 0,
        }

        existing.total += 1
        if (row.status === 'pending') existing.pending += 1
        if (row.status === 'scheduled') existing.scheduled += 1
        if (row.status === 'sent') existing.sent += 1
        if (row.status === 'failed') existing.failed += 1

        byAccount.set(key, existing)
      })

      setSelectedTask(task)
      setSelectedTaskAllocations(Array.from(byAccount.values()))
      setIsTaskModalOpen(true)
    } catch (err) {
      console.error('Error loading allocations:', err)
      alert(err.message || 'Failed to load task details')
    }
  }

  const navigateToEmailList = () => {
    router.push(`/dashboard/outbounds/${outboundId}/email-list`)
  }

  const navigateToReplies = () => {
    router.push(`/dashboard/outbounds/${outboundId}/replies`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/outbounds')}
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          ← Back to Outbounds
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!outbound) return null

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/outbounds')}
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Back to Outbounds
      </button>

      {/* Outbound header with stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{outbound.name}</h1>
              <p className="text-gray-500 mt-1">
                Created on {new Date(outbound.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full font-semibold ${getStatusColor(outbound.status)}`}
            >
              {outbound.status.charAt(0).toUpperCase() + outbound.status.slice(1)}
            </span>
          </div>

          {/* Stats cards - Now only 2 cards (Total Sent and Total Replies) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{outboundStats.totalSent}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Replies</p>
                  <p className="text-2xl font-bold text-gray-900">{outboundStats.totalReplies}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={navigateToEmailList}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
              View Email List
            </button>
            
            <button
              onClick={navigateToReplies}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                />
              </svg>
              View Replies
            </button>
            
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              Create New Task
            </button>
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage email sending tasks for this outbound campaign
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </p>
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                + New Task
              </button>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Get started by creating your first email sending task. Tasks allow you to schedule and manage email campaigns.
            </p>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled At
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
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{task.name}</div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(task.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.type === 'followup' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {task.type === 'followup' ? 'Follow-up' : 'Initial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.scheduled_at
                        ? new Date(task.scheduled_at).toLocaleString()
                        : 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTaskStatusColor(task.status)}`}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => loadTaskWithAllocations(task)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          // Add edit functionality here if needed
                          console.log('Edit task:', task.id)
                        }}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {isTaskModalOpen && (
        <TaskDetailsModal
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          allocations={selectedTaskAllocations}
          onRefresh={fetchOutboundAndTasks}
        />
      )}

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && outbound && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onSuccess={() => {
            setIsCreateTaskModalOpen(false)
            fetchOutboundAndTasks() // Refresh tasks after creating a new one
            fetchOutboundStats() // Refresh stats too
          }}
          outbound={outbound}
        />
      )}
    </div>
  )
}