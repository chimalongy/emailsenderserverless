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
  FiClock,
  FiCheckCircle,
  FiPauseCircle,
  FiPlayCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiChevronRight,
  FiMoreVertical,
  FiFileText
} from 'react-icons/fi'

// Custom components with mobile optimizations
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-80 space-y-3 p-4">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
    <p className="text-gray-500 text-sm">Loading campaign details...</p>
  </div>
)

const ErrorState = ({ error, onBack }) => (
  <div className="space-y-3 p-3">
    <button
      onClick={onBack}
      className="flex items-center text-xs text-teal-600 hover:text-teal-500 transition-colors group"
    >
      <FiArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      Back to Campaigns
    </button>
    <div className="bg-red-50 border-l-3 border-red-400 p-3 rounded">
      <div className="flex">
        <FiAlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-800 font-medium text-sm">Error loading campaign</p>
          <p className="text-red-700 text-xs break-words mt-1">{error}</p>
        </div>
      </div>
    </div>
  </div>
)

const TaskStatusBadge = ({ status }) => {
  const config = {
    scheduled: { color: 'bg-blue-50 text-blue-700', icon: FiClock },
    in_progress: { color: 'bg-amber-50 text-amber-700', icon: FiRefreshCw },
    completed: { color: 'bg-emerald-50 text-emerald-700', icon: FiCheckCircle },
    failed: { color: 'bg-red-50 text-red-700', icon: FiAlertCircle },
    paused: { color: 'bg-gray-50 text-gray-700', icon: FiPauseCircle },
  }

  const { color, icon: Icon } = config[status] || config.scheduled
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${color} flex-shrink-0`}>
      <Icon className="mr-1 h-3 w-3" />
      <span className="truncate">{label}</span>
    </span>
  )
}

const ActionButton = ({ icon: Icon, label, onClick, variant = 'primary', className = '', showLabel = true }) => {
  const variants = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white',
    secondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    blue: 'bg-sky-600 hover:bg-sky-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900 border border-gray-200',
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center p-2 rounded-lg text-xs transition-colors ${variants[variant]} ${className} flex-shrink-0`}
      title={!showLabel ? label : undefined}
    >
      <Icon className="h-3.5 w-3.5 sm:mr-1.5 flex-shrink-0" />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
    </button>
  )
}

const OutboundStatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
    paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-sky-50 text-sky-700' },
    draft: { label: 'Draft', className: 'bg-gray-50 text-gray-700' },
  }

  const config = statusConfig[status] || statusConfig.draft
  
  return (
    <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${config.className} flex-shrink-0`}>
      {config.label}
    </span>
  )
}

// Compact Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color = 'teal' }) => {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
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
  const [showMoreActions, setShowMoreActions] = useState(false)

  // Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)

  const fetchOutboundAndTasks = useCallback(async () => {
    if (!user || !outboundId) return

    setRefreshing(true)
    setError('')

    try {
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbounds')
        .select('*')
        .eq('id', outboundId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (outboundError) throw outboundError
      if (!outboundData) {
        setError('Campaign not found or you do not have access to it.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      setOutbound(outboundData)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('outbound_id', outboundId)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      setTasks(tasksData || [])
    } catch (err) {
      console.error('Error loading campaign detail:', err)
      setError(err.message || 'Failed to load campaign details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, outboundId])

  useEffect(() => {
    if (!user || !outboundId) return
    fetchOutboundAndTasks()
  }, [user, outboundId, fetchOutboundAndTasks])

  const loadTaskWithAllocations = async (task) => {
    try {
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
  }

  // Calculate stats for tasks
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    scheduled: tasks.filter(t => t.status === 'scheduled').length,
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState error={error} onBack={() => router.push('/dashboard/outbounds')} />
  if (!outbound) return null

  return (
    <div className="space-y-3 max-w-7xl mx-auto px-2 py-2 sm:px-4 lg:px-8">
      {/* Header with back button and refresh */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => router.push('/dashboard/outbounds')}
          className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors group flex-shrink-0"
        >
          <FiArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="truncate hidden sm:inline">Back to Campaigns</span>
          <span className="truncate sm:hidden">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 p-1.5"
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="inline-flex items-center p-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
            title="New Task"
          >
            <FiPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">New Task</span>
          </button>
        </div>
      </div>

      {/* Outbound header - Mobile Optimized */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Main content */}
            <div className="flex-1">
              <div className="flex gap-2">
                <div className="p-2 bg-teal-50 rounded-lg border border-teal-100 flex-shrink-0">
                  <FiFileText className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h1 className="text-base font-bold text-gray-900 truncate" title={outbound.name}>
                        {outbound.name}
                      </h1>
                    </div>
                    <OutboundStatusBadge status={outbound.status} />
                  </div>
                  
                  {/* Description */}
                  {outbound.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2 break-words leading-relaxed">
                      {outbound.description}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                    <span className="flex items-center bg-gray-50 px-2 py-1 rounded">
                      <FiCalendar className="mr-1.5 h-3 w-3 text-gray-400" />
                      {new Date(outbound.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton
                    icon={FiMail}
                    label="Email List"
                    onClick={navigateToEmailList}
                    variant="blue"
                  />
                  <ActionButton
                    icon={FiMessageSquare}
                    label="Replies"
                    onClick={navigateToReplies}
                    variant="success"
                  />
                  <ActionButton
                    icon={FiEdit2}
                    label="Edit"
                    onClick={() => {}}
                    variant="secondary"
                  />
                  
                  {/* More actions dropdown */}
                  <div className="relative">
                    <ActionButton
                      icon={FiMoreVertical}
                      label="More"
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      variant="ghost"
                      showLabel={false}
                    />
                    
                    {showMoreActions && (
                      <>
                        <div 
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMoreActions(false)}
                        />
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowMoreActions(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <FiFileText className="mr-2 h-3.5 w-3.5" />
                            Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowMoreActions(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <FiAlertCircle className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats - Horizontal on mobile */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h3 className="text-xs font-medium text-gray-700 mb-2">Campaign Stats</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{taskStats.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{taskStats.completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">{taskStats.in_progress}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-sky-600">{taskStats.scheduled}</p>
                  <p className="text-xs text-gray-500">Scheduled</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks section - Mobile Optimized */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-teal-50 rounded border border-teal-100 flex-shrink-0">
                <FiCalendar className="h-4 w-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 truncate">Tasks</h2>
                <p className="text-xs text-gray-500 truncate">
                  {tasks.length} task{tasks.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-6 px-3">
            <div className="mx-auto w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100">
              <FiCalendar className="h-5 w-5 text-teal-500" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
            <p className="mt-1 text-xs text-gray-500">
              Create your first task to start this campaign
            </p>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="mt-3 inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <FiPlus className="h-3.5 w-3.5 mr-1.5" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => loadTaskWithAllocations(task)}
              >
                <div className="flex justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-gray-50 rounded border border-gray-200 flex-shrink-0 mt-0.5">
                        <FiClock className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <h3 
                            className="text-sm font-medium text-gray-900 truncate min-w-0 flex-1"
                            title={task.name}
                          >
                            {task.name}
                          </h3>
                          <TaskStatusBadge status={task.status} />
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-1 break-words">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 text-[10px] text-gray-500">
                          <span className="bg-gray-50 px-2 py-0.5 rounded">
                            {task.type === 'followup' ? 'Follow-up' : 'Initial'}
                          </span>
                          {task.scheduled_at && (
                            <span className="bg-gray-50 px-2 py-0.5 rounded">
                              {new Date(task.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center self-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadTaskWithAllocations(task)
                      }}
                      className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                      title="View Details"
                    >
                      <FiChevronRight className="h-4 w-4" />
                    </button>
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
          }}
          outbound={outbound}
        />
      )}
    </div>
  )
}