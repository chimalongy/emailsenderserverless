'use client'

import { useState, useEffect, useMemo } from 'react'
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
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaFolder,
  FaEnvelope,
  FaChevronDown,
  FaChevronRight,
  FaCalendarAlt
} from 'react-icons/fa'
import { FiRefreshCw } from 'react-icons/fi'
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
  
  // Accordion state management
  const [expandedYears, setExpandedYears] = useState(new Set())
  const [expandedMonths, setExpandedMonths] = useState(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState(new Set())

  useEffect(() => {
    if (user) {
      fetchOutbounds()
    }
  }, [user])

  // Set current year, month, and week as expanded by default
  useEffect(() => {
    if (outbounds.length > 0) {
      const now = new Date()
      const currentYear = now.getFullYear().toString()
      const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const currentWeek = getWeekNumber(now)
      const currentWeekKey = `${currentMonth}-week${currentWeek}`
      
      // Expand current year
      setExpandedYears(prev => {
        const newSet = new Set(prev)
        newSet.add(currentYear)
        return newSet
      })
      
      // Expand current month
      setExpandedMonths(prev => {
        const newSet = new Set(prev)
        newSet.add(currentMonth)
        return newSet
      })
      
      // Expand current week
      setExpandedWeeks(prev => {
        const newSet = new Set(prev)
        newSet.add(currentWeekKey)
        return newSet
      })
    }
  }, [outbounds])

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

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }

  // Categorize outbounds by year, month, and week
  const categorizedOutbounds = useMemo(() => {
    const categories = {}
    
    outbounds.forEach(outbound => {
      const date = new Date(outbound.created_at)
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // 1-12
      const week = getWeekNumber(date)
      
      // Create year key
      const yearKey = year.toString()
      if (!categories[yearKey]) {
        categories[yearKey] = {
          year,
          months: {}
        }
      }
      
      // Create month key
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      if (!categories[yearKey].months[monthKey]) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        categories[yearKey].months[monthKey] = {
          month,
          monthName: monthNames[month - 1],
          weeks: {}
        }
      }
      
      // Create week key
      const weekKey = `${monthKey}-week${week}`
      if (!categories[yearKey].months[monthKey].weeks[weekKey]) {
        categories[yearKey].months[monthKey].weeks[weekKey] = {
          week,
          outbounds: []
        }
      }
      
      // Add outbound to week
      categories[yearKey].months[monthKey].weeks[weekKey].outbounds.push(outbound)
    })
    
    return categories
  }, [outbounds])

  // Toggle accordion functions
  const toggleYear = (year) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev)
      if (newSet.has(year)) {
        newSet.delete(year)
      } else {
        newSet.add(year)
      }
      return newSet
    })
  }

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      return newSet
    })
  }

  const toggleWeek = (weekKey) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey)
      } else {
        newSet.add(weekKey)
      }
      return newSet
    })
  }

  // Expand/Collapse all functions
  const expandAll = () => {
    const allYears = Object.keys(categorizedOutbounds)
    const allMonths = []
    const allWeeks = []
    
    Object.values(categorizedOutbounds).forEach(yearData => {
      Object.keys(yearData.months).forEach(monthKey => {
        allMonths.push(monthKey)
        Object.keys(yearData.months[monthKey].weeks).forEach(weekKey => {
          allWeeks.push(weekKey)
        })
      })
    })
    
    setExpandedYears(new Set(allYears))
    setExpandedMonths(new Set(allMonths))
    setExpandedWeeks(new Set(allWeeks))
  }

  const collapseAll = () => {
    setExpandedYears(new Set())
    setExpandedMonths(new Set())
    setExpandedWeeks(new Set())
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
        return <FaPlay className="h-3 w-3 text-emerald-500 flex-shrink-0" />
      case 'paused':
        return <FaPause className="h-3 w-3 text-amber-500 flex-shrink-0" />
      case 'completed':
        return <FaCheckCircle className="h-3 w-3 text-sky-500 flex-shrink-0" />
      default:
        return <FaClock className="h-3 w-3 text-gray-400 flex-shrink-0" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'paused':
        return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'completed':
        return 'bg-sky-50 text-sky-700 border-sky-100'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100'
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

  // Truncate long campaign names
  const truncateCampaignName = (name, maxLength = 20) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-sm">
              <TbMailForward className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Campaigns</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Manage your email outreach campaigns
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => fetchOutbounds(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 text-sm"
            title="Refresh"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 sm:focus:ring-offset-2 transition-colors text-sm sm:text-base"
          >
            <FaPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-semibold">New</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {outbounds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-3 sm:p-4 rounded-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-teal-800 mb-0.5 sm:mb-1">Campaigns</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{outbounds.length}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-white/50 rounded-lg">
                <TbMailForward className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-800 mb-0.5 sm:mb-1">Tasks</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">
                  {outbounds.reduce((sum, o) => sum + (o.task_count || 0), 0)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-white/50 rounded-lg">
                <FaTasks className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-800 mb-0.5 sm:mb-1">Emails</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">
                  {outbounds.reduce((sum, o) => sum + (o.email_count || 0), 0)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-white/50 rounded-lg">
                <FaEnvelope className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Controls */}
      {outbounds.length > 0 && (
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 border-b border-gray-200 pb-2 sm:pb-3">
          <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
            <FaCalendarAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Organized by date</span>
          </div>
          <div className="flex gap-1 self-end xs:self-auto">
            <button
              onClick={expandAll}
              className="px-2 sm:px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 sm:px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Outbounds List with Accordion Categories */}
      <div className="space-y-2 sm:space-y-3">
        {outbounds.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-100">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 rounded-full mb-3 sm:mb-4">
              <TbMailForward className="h-7 w-7 sm:h-8 sm:w-8 text-teal-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1.5 sm:mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 max-w-sm mx-auto">
              Create your first campaign to start reaching out to prospects.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-teal-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base"
            >
              <FaPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="font-semibold">Create Campaign</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {Object.entries(categorizedOutbounds)
              .sort(([a], [b]) => b - a)
              .map(([year, yearData]) => {
                const isYearExpanded = expandedYears.has(year)
                
                return (
                  <div key={year} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Year Accordion Header */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={`p-1 rounded flex-shrink-0 ${isYearExpanded ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                          {isYearExpanded ? (
                            <FaChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <FaChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{year}</h3>
                          <p className="text-xs text-gray-500">
                            {Object.values(yearData.months).reduce((sum, month) => 
                              sum + Object.values(month.weeks).reduce((weekSum, week) => 
                                weekSum + week.outbounds.length, 0), 0
                            )} campaigns
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {Object.keys(yearData.months).length} months
                      </div>
                    </button>

                    {/* Year Content */}
                    {isYearExpanded && (
                      <div className="divide-y divide-gray-100">
                        {Object.entries(yearData.months)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([monthKey, monthData]) => {
                            const isMonthExpanded = expandedMonths.has(monthKey)
                            
                            return (
                              <div key={monthKey}>
                                {/* Month Accordion Header */}
                                <button
                                  onClick={() => toggleMonth(monthKey)}
                                  className="w-full p-2.5 sm:p-3 pl-8 sm:pl-10 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <div className={`p-1 rounded flex-shrink-0 ${isMonthExpanded ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                      {isMonthExpanded ? (
                                        <FaChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      ) : (
                                        <FaChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      )}
                                    </div>
                                    <div className="text-left min-w-0">
                                      <h4 className="font-medium text-gray-800 text-sm sm:text-base truncate">{monthData.monthName}</h4>
                                      <p className="text-xs text-gray-500">
                                        {Object.values(monthData.weeks).reduce((sum, week) => 
                                          sum + week.outbounds.length, 0
                                        )} campaigns
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                    {Object.keys(monthData.weeks).length} weeks
                                  </div>
                                </button>

                                {/* Month Content */}
                                {isMonthExpanded && (
                                  <div className="divide-y divide-gray-100">
                                    {Object.entries(monthData.weeks)
                                      .sort(([a], [b]) => b.localeCompare(a))
                                      .map(([weekKey, weekData]) => {
                                        const isWeekExpanded = expandedWeeks.has(weekKey)
                                        
                                        return (
                                          <div key={weekKey}>
                                            {/* Week Accordion Header */}
                                            <button
                                              onClick={() => toggleWeek(weekKey)}
                                              className="w-full p-2.5 sm:p-3 pl-12 sm:pl-14 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                <div className={`p-1 rounded flex-shrink-0 ${isWeekExpanded ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                  {isWeekExpanded ? (
                                                    <FaChevronDown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                  ) : (
                                                    <FaChevronRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                  )}
                                                </div>
                                                <div className="text-left min-w-0">
                                                  <h5 className="text-gray-800 text-sm truncate">Week {weekData.week}</h5>
                                                  <p className="text-xs text-gray-500">
                                                    {weekData.outbounds.length} campaigns
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-xs text-gray-500 flex-shrink-0 ml-2 whitespace-nowrap">
                                                {new Date(weekData.outbounds[0]?.created_at).toLocaleDateString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric' 
                                                })}
                                              </div>
                                            </button>

                                            {/* Week Content - Outbounds List */}
                                            {isWeekExpanded && (
                                              <div className="bg-gray-50 p-3 sm:p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                                  {weekData.outbounds.map((outbound) => (
                                                    <div
                                                      key={outbound.id}
                                                      className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-teal-200 hover:shadow-sm transition-all"
                                                    >
                                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                                                          <div className="p-2 bg-teal-50 rounded-lg flex-shrink-0">
                                                            <TbMailForward className="h-4 w-4 text-teal-600" />
                                                          </div>
                                                          <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate" title={outbound.name}>
                                                              {outbound.name}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                              {new Date(outbound.created_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                              })}
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(outbound.status)} flex-shrink-0 w-fit sm:w-auto self-start sm:self-auto`}>
                                                          {getStatusIcon(outbound.status)}
                                                          <span className="truncate">{getStatusText(outbound.status)}</span>
                                                        </div>
                                                      </div>
                                                      
                                                      <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
                                                        <div className="text-center flex-1 p-2 bg-blue-50 rounded-lg">
                                                          <div className="text-sm font-semibold text-gray-800">{outbound.task_count || 0}</div>
                                                          <div className="text-xs text-gray-500">Tasks</div>
                                                        </div>
                                                        <div className="text-center flex-1 p-2 bg-purple-50 rounded-lg">
                                                          <div className="text-sm font-semibold text-gray-800">{outbound.email_count || 0}</div>
                                                          <div className="text-xs text-gray-500">Emails</div>
                                                        </div>
                                                      </div>
                                                      
                                                      <div className="flex gap-1.5 sm:gap-2">
                                                        <Link
                                                          href={`/dashboard/outbounds/${outbound.id}`}
                                                          className="flex-1 text-center py-2 bg-teal-50 text-teal-700 font-medium text-xs sm:text-sm rounded-lg hover:bg-teal-100 transition-colors"
                                                        >
                                                          View
                                                        </Link>
                                                        <button
                                                          onClick={() => handleCreateTask(outbound)}
                                                          className="px-2.5 sm:px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                                                          title="Create Task"
                                                        >
                                                          <FaTasks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                          <span className="sr-only sm:not-sr-only sm:ml-1">Task</span>
                                                        </button>
                                                        <button
                                                          onClick={() => handleDeleteOutbound(outbound)}
                                                          disabled={deleting === outbound.id}
                                                          className="px-2.5 sm:px-3 py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                                          title="Delete Campaign"
                                                        >
                                                          {deleting === outbound.id ? (
                                                            <FiRefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                                          ) : (
                                                            <FaTrash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                          )}
                                                          <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
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