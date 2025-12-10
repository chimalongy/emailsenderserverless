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
        <FiAlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-red-800 font-medium truncate">Error loading outbound</p>
          <p className="text-red-700 mt-1 break-words">{error}</p>
        </div>
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color} flex-shrink-0`}>
      <Icon className="mr-1.5 h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </span>
  )
}

const ActionButton = ({ icon: Icon, label, onClick, variant = 'primary', className = '', showLabel = true }) => {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${variants[variant]} ${className} flex-shrink-0`}
      title={!showLabel ? label : undefined}
    >
      <Icon className="h-4 w-4 sm:mr-2" />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {!showLabel && <span className="sr-only">{label}</span>}
    </button>
  )
}

const OutboundStatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800' },
    paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800' },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  }

  const config = statusConfig[status] || statusConfig.draft
  
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.className} flex-shrink-0`}>
      {config.label}
    </span>
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

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState error={error} onBack={() => router.push('/dashboard/outbounds')} />
  if (!outbound) return null

  return (
    <div className="space-y-6 max-w-7xl mx-auto  sm:px-4 lg:px-8 py-4">
      {/* Header with back button and refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => router.push('/dashboard/outbounds')}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <FiArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Back to Outbounds</span>
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''} flex-shrink-0`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Outbound header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Main header with icon and title */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-indigo-50 rounded-xl flex-shrink-0">
              <HiOutlineDocumentText className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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
              
              {/* Description if exists */}
              {outbound.description && (
                <p className="text-sm text-gray-600 mt-2 break-words line-clamp-2">
                  {outbound.description}
                </p>
              )}
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-sm text-gray-500">
                <span className="flex items-center flex-shrink-0">
                  <FiCalendar className="mr-1.5 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Created {new Date(outbound.created_at).toLocaleDateString()}</span>
                </span>
                {outbound.updated_at && (
                  <span className="flex items-center flex-shrink-0">
                    <FiClock className="mr-1.5 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Updated {new Date(outbound.updated_at).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="pt-4 sm:pt-6 border-t border-gray-200">
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
                icon={FiPlus}
                label="Create Task"
                onClick={() => setIsCreateTaskModalOpen(true)}
                variant="primary"
              />
              
              {/* Mobile: More actions dropdown */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="inline-flex items-center p-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <FiMoreVertical className="h-4 w-4" />
                </button>
                
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
                        <FiEdit2 className="mr-3 h-4 w-4" />
                        Edit Outbound
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Add duplicate action here
                          setShowMoreActions(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <FiFileText className="mr-3 h-4 w-4" />
                        Duplicate
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                <HiOutlineCalendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Tasks</h2>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  Manage email sending tasks for this campaign
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
              {/* <ActionButton
                icon={FiPlus}
                label="New Task"
                onClick={() => setIsCreateTaskModalOpen(true)}
                variant="primary"
                className="hidden sm:flex"
              /> */}
              {/* <ActionButton
                icon={FiPlus}
                label="New Task"
                onClick={() => setIsCreateTaskModalOpen(true)}
                variant="primary"
                showLabel={false}
                className="sm:hidden"
              /> */}
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <HiOutlineCalendar className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-gray-900">No tasks yet</h3>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Create your first email sending task to start this campaign.
            </p>
            <ActionButton
              icon={FiPlus}
              label="Create your first task"
              onClick={() => setIsCreateTaskModalOpen(true)}
              variant="primary"
              className="mt-4 sm:mt-6"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => loadTaskWithAllocations(task)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 
                        className="font-medium text-gray-900 truncate min-w-0 flex-1"
                        title={task.name}
                      >
                        {task.name}
                      </h3>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center flex-shrink-0">
                        <HiOutlineTag className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{task.type === 'followup' ? 'Follow-up' : 'Initial'}</span>
                      </span>
                      {task.scheduled_at && (
                        <span className="flex items-center flex-shrink-0">
                          <FiCalendar className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{new Date(task.scheduled_at).toLocaleDateString()}</span>
                        </span>
                      )}
                      <span className="flex items-center flex-shrink-0">
                        <HiOutlineStatusOnline className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(task.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 self-end sm:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadTaskWithAllocations(task)
                      }}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex-shrink-0"
                    >
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">Details</span>
                      <FiChevronRight className="ml-1 h-4 w-4 flex-shrink-0" />
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