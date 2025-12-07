'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/AuthProvider'
import TaskDetailsModal from './components/TaskDetailsModal'
import CreateTaskModal from '../../../components/CreateTaskModal'
import {
  FiArrowLeft,
  FiMail,
  FiMessageSquare,
  FiPlus,
  FiCalendar,
  FiEdit2,
  FiEye,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiPauseCircle,
  FiPlayCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiExternalLink,
  FiChevronRight,
  FiFilter,
  FiTrendingUp
} from 'react-icons/fi'
import {
  HiOutlineMail,
  HiOutlineChatAlt2,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineStatusOnline,
  HiOutlineTag
} from 'react-icons/hi'
import { TbMail, TbMessages } from 'react-icons/tb'

// Custom components
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    <p className="text-gray-500">Loading outbound details...</p>
  </div>
)

const ErrorState = ({ error, onBack }) => (
  <div className="space-y-4">
    <button
      onClick={onBack}
      className="flex items-center text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
    >
      <FiArrowLeft className="mr-2" />
      Back to Outbounds
    </button>
    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
      <div className="flex">
        <FiAlertCircle className="h-5 w-5 text-red-400 mr-3" />
        <div>
          <p className="text-red-800 font-medium">Error loading outbound</p>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </div>
  </div>
)

const StatCard = ({ icon: Icon, label, value, color = 'blue', isLoading = false }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        {isLoading ? (
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-${color}-50`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
    </div>
  </div>
)

const TaskStatusBadge = ({ status }) => {
  const config = {
    scheduled: { color: 'bg-blue-100 text-blue-800', icon: FiClock },
    in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: FiRefreshCw },
    completed: { color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
    failed: { color: 'bg-red-100 text-red-800', icon: FiAlertCircle },
    paused: { color: 'bg-gray-100 text-gray-800', icon: FiPauseCircle },
  }

  const { color, icon: Icon } = config[status] || config.scheduled
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </span>
  )
}

const ActionButton = ({ icon: Icon, label, onClick, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${variants[variant]} ${className}`}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  )
}

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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [outboundStats, setOutboundStats] = useState({
    totalSent: 0,
    totalReplies: 0,
    pending: 0,
    successRate: 0,
  })

  // Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)

  const fetchOutboundAndTasks = useCallback(async () => {
    if (!user || !outboundId) return

    setRefreshing(true)
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
        setRefreshing(false)
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
      setError(err.message || 'Failed to load outbound details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, outboundId])

  const fetchOutboundStats = useCallback(async () => {
    if (!user || !outboundId) return

    try {
      // Get total emails sent for this outbound
      const { data: sentData, error: sentError } = await supabase
        .from('email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('outbound_id', outboundId)
        .eq('user_id', user.id)
        .eq('status', 'sent')

      if (sentError) throw sentError

      // Get pending emails
      const { data: pendingData } = await supabase
        .from('email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('outbound_id', outboundId)
        .eq('user_id', user.id)
        .in('status', ['pending', 'scheduled'])

      // Get total replies for this outbound
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select('id', { count: 'exact', head: true })
        .eq('outbound_id', outboundId)
        .eq('user_id', user.id)

      if (repliesError) throw repliesError

      const totalSent = sentData?.count || 0
      const totalReplies = repliesData?.count || 0
      const successRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0

      setOutboundStats({
        totalSent,
        totalReplies,
        pending: pendingData?.count || 0,
        successRate,
      })
    } catch (err) {
      console.error('Error fetching outbound stats:', err)
    }
  }, [user, outboundId])

  useEffect(() => {
    if (!user || !outboundId) return
    fetchOutboundAndTasks()
    fetchOutboundStats()
  }, [user, outboundId, fetchOutboundAndTasks, fetchOutboundStats])

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

  const handleRefresh = () => {
    fetchOutboundAndTasks()
    fetchOutboundStats()
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState error={error} onBack={() => router.push('/dashboard/outbounds')} />
  if (!outbound) return null

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-2 lg:px-8 py-2">
      {/* Header with back button and refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/outbounds')}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Outbounds
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Outbound header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <HiOutlineDocumentText className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{outbound.name}</h1>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    outbound.status === 'active' ? 'bg-green-100 text-green-800' :
                    outbound.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    outbound.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {outbound.status.charAt(0).toUpperCase() + outbound.status.slice(1)}
                  </span>
                </div>
              
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <FiCalendar className="mr-1.5 h-4 w-4" />
                    Created {new Date(outbound.created_at).toLocaleDateString()}
                  </span>
                  {outbound.updated_at && (
                    <span className="flex items-center">
                      <FiClock className="mr-1.5 h-4 w-4" />
                      Updated {new Date(outbound.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
         
        </div>

     

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200">
          <ActionButton
            icon={HiOutlineMail}
            label="View Email List"
            onClick={navigateToEmailList}
            variant="blue"
          />
          <ActionButton
            icon={HiOutlineChatAlt2}
            label="View Replies"
            onClick={navigateToReplies}
            variant="success"
          />
          <ActionButton
            icon={FiPlus}
            label="Create Task"
            onClick={() => setIsCreateTaskModalOpen(true)}
            variant="primary"
          />
         
        </div>
      </div>

      {/* Tasks section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <HiOutlineCalendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage email sending tasks for this campaign
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
              {/* <ActionButton
                icon={FiPlus}
                label="New Task"
                onClick={() => setIsCreateTaskModalOpen(true)}
                variant="primary"
              /> */}
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <HiOutlineCalendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Create your first email sending task to start this campaign. Tasks allow you to schedule and manage email delivery.
            </p>
            <ActionButton
              icon={FiPlus}
              label="Create your first task"
              onClick={() => setIsCreateTaskModalOpen(true)}
              variant="primary"
              className="mt-6"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => loadTaskWithAllocations(task)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{task.name}</h3>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {task.description || 'No description provided'}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <HiOutlineTag className="mr-1.5 h-4 w-4" />
                        {task.type === 'followup' ? 'Follow-up' : 'Initial'}
                      </span>
                      {task.scheduled_at && (
                        <span className="flex items-center">
                          <FiCalendar className="mr-1.5 h-4 w-4" />
                          {new Date(task.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center">
                        <HiOutlineStatusOnline className="mr-1.5 h-4 w-4" />
                        Created {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadTaskWithAllocations(task)
                      }}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      View Details
                      <FiChevronRight className="ml-1 h-4 w-4" />
                    </button>
                    {/* <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Edit functionality here
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isTaskModalOpen && (
        <TaskDetailsModal
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          allocations={selectedTaskAllocations}
          onRefresh={fetchOutboundAndTasks}
        />
      )}

      {isCreateTaskModalOpen && outbound && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onSuccess={() => {
            setIsCreateTaskModalOpen(false)
            fetchOutboundAndTasks()
            fetchOutboundStats()
          }}
          outbound={outbound}
        />
      )}
    </div>
  )
}