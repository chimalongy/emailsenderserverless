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
  FiTrendingUp,
  FiMoreVertical
} from 'react-icons/fi'
import {
  HiOutlineMail,
  HiOutlineChatAlt2,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineStatusOnline,
  HiOutlineTag
} from 'react-icons/hi'

// Custom components
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    <p className="text-gray-500">Loading outbound details...</p>
  </div>
)

const ErrorState = ({ error, onBack }) => (
  <div className="space-y-4">
    <button
      onClick={onBack}
      className="flex items-center text-sm text-teal-600 hover:text-teal-500 transition-colors group"
    >
      <FiArrowLeft className="mr-2 transition-transform group-hover:-translate-x-1" />
      Back to Outbounds
    </button>
    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
      <div className="flex">
        <FiAlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-red-800 font-medium truncate">Error loading outbound</p>
          <p className="text-red-700 mt-1 break-words text-sm">{error}</p>
        </div>
      </div>
    </div>
  </div>
)

const TaskStatusBadge = ({ status }) => {
  const config = {
    scheduled: { color: 'bg-blue-50 text-blue-700 border border-blue-100', icon: FiClock },
    in_progress: { color: 'bg-amber-50 text-amber-700 border border-amber-100', icon: FiRefreshCw },
    completed: { color: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: FiCheckCircle },
    failed: { color: 'bg-red-50 text-red-700 border border-red-100', icon: FiAlertCircle },
    paused: { color: 'bg-gray-50 text-gray-700 border border-gray-100', icon: FiPauseCircle },
  }

  const { color, icon: Icon } = config[status] || config.scheduled
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${color} flex-shrink-0`}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </span>
  )
}

const ActionButton = ({ icon: Icon, label, onClick, variant = 'primary', className = '', showLabel = true }) => {
  const variants = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow transition-all duration-200',
    secondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow',
    blue: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow',
    ghost: 'bg-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-900 border border-gray-200',
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3.5 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 active:scale-95 ${variants[variant]} ${className} flex-shrink-0`}
      title={!showLabel ? label : undefined}
    >
      <Icon className="h-4 w-4 sm:mr-2 flex-shrink-0" />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
    </button>
  )
}

const OutboundStatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    completed: { label: 'Completed', className: 'bg-sky-50 text-sky-700 border border-sky-100' },
    draft: { label: 'Draft', className: 'bg-gray-50 text-gray-700 border border-gray-100' },
  }

  const config = statusConfig[status] || statusConfig.draft
  
  return (
    <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${config.className} flex-shrink-0`}>
      {config.label}
    </span>
  )
}

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color = 'teal' }) => {
  const colors = {
    teal: 'bg-teal-50 text-teal-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
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

  useEffect(() => {
    if (!user || !outboundId) return
    fetchOutboundAndTasks()
  }, [user, outboundId, fetchOutboundAndTasks])

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
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
      {/* Header with back button and refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => router.push('/dashboard/outbounds')}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <FiArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="truncate">Back to Outbounds</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 group"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-300`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Outbound header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 flex-shrink-0">
                  <HiOutlineDocumentText className="h-7 w-7 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={outbound.name}>
                        {outbound.name}
                      </h1>
                      <div className="sm:hidden">
                        <OutboundStatusBadge status={outbound.status} />
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <OutboundStatusBadge status={outbound.status} />
                    </div>
                  </div>
                  
                  {/* Description */}
                  {outbound.description && (
                    <p className="text-sm text-gray-600 mb-4 break-words leading-relaxed">
                      {outbound.description}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                      <FiCalendar className="mr-2 h-4 w-4 text-gray-400" />
                      Created {new Date(outbound.created_at).toLocaleDateString()}
                    </span>
                    {outbound.updated_at && (
                      <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                        <FiClock className="mr-2 h-4 w-4 text-gray-400" />
                        Updated {new Date(outbound.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 sm:gap-3">
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
                    icon={FiEdit2}
                    label="Edit Campaign"
                    onClick={() => {}}
                    variant="secondary"
                  />
                  
                  {/* Mobile: More actions dropdown */}
                  <div className="relative sm:hidden">
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
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Add additional actions here
                              setShowMoreActions(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <FiFileText className="mr-3 h-4 w-4" />
                            Duplicate Campaign
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Add delete action here
                              setShowMoreActions(false)
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <FiAlertCircle className="mr-3 h-4 w-4" />
                            Delete Campaign
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Tasks</span>
                    <span className="font-medium text-gray-900">{taskStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-medium text-emerald-600">{taskStats.completed}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">In Progress</span>
                    <span className="font-medium text-amber-600">{taskStats.in_progress}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Scheduled</span>
                    <span className="font-medium text-sky-600">{taskStats.scheduled}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100 flex-shrink-0">
                <HiOutlineCalendar className="h-5 w-5 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Campaign Tasks</h2>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  Manage all email sending tasks for this campaign
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  {tasks.length} task{tasks.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-full flex items-center justify-center border border-teal-100">
              <HiOutlineCalendar className="h-7 w-7 text-teal-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks created yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Tasks organize your email sending schedule. Create your first task to start this campaign.
            </p>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="mt-6 inline-flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
            >
              <FiPlus className="h-4 w-4 mr-2" />
              Create First Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => loadTaskWithAllocations(task)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 group-hover:border-gray-300 flex-shrink-0 mt-0.5">
                        <HiOutlineStatusOnline className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 
                            className="font-medium text-gray-900 truncate min-w-0 flex-1 group-hover:text-teal-600 transition-colors"
                            title={task.name}
                          >
                            {task.name}
                          </h3>
                          <TaskStatusBadge status={task.status} />
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                            <HiOutlineTag className="mr-1.5 h-3.5 w-3.5" />
                            {task.type === 'followup' ? 'Follow-up Task' : 'Initial Outreach'}
                          </span>
                          {task.scheduled_at && (
                            <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                              <FiCalendar className="mr-1.5 h-3.5 w-3.5" />
                              {new Date(task.scheduled_at).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                            <FiClock className="mr-1.5 h-3.5 w-3.5" />
                            Created {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadTaskWithAllocations(task)
                      }}
                      className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors group/view"
                    >
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                      <FiChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/view:translate-x-1" />
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