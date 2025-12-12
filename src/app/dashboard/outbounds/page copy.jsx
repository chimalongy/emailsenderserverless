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
  FaRocket,
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

      {/* Stats Summary */}
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

      {/* Category Controls */}
      {outbounds.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <FaCalendarAlt className="h-4 w-4" />
            <span>Campaigns organized by date created</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Outbounds List with Accordion Categories */}
      <div className="space-y-4">
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
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(categorizedOutbounds)
              .sort(([a], [b]) => b - a) // Sort years descending
              .map(([year, yearData]) => {
                const isYearExpanded = expandedYears.has(year)
                
                return (
                  <div key={year} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Year Accordion Header */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                          {isYearExpanded ? (
                            <FaChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <FaChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg text-gray-900">{year}</h3>
                          <p className="text-sm text-gray-500">
                            {Object.values(yearData.months).reduce((sum, month) => 
                              sum + Object.values(month.weeks).reduce((weekSum, week) => 
                                weekSum + week.outbounds.length, 0), 0
                            )} campaigns
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {Object.keys(yearData.months).length} months
                      </div>
                    </button>

                    {/* Year Content */}
                    {isYearExpanded && (
                      <div className="border-t border-gray-100">
                        {Object.entries(yearData.months)
                          .sort(([a], [b]) => b.localeCompare(a)) // Sort months descending
                          .map(([monthKey, monthData]) => {
                            const isMonthExpanded = expandedMonths.has(monthKey)
                            
                            return (
                              <div key={monthKey} className="border-t border-gray-100 first:border-t-0">
                                {/* Month Accordion Header */}
                                <button
                                  onClick={() => toggleMonth(monthKey)}
                                  className="w-full p-4 sm:p-5 pl-8 sm:pl-12 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-gray-100 rounded-md">
                                      {isMonthExpanded ? (
                                        <FaChevronDown className="h-3 w-3 text-gray-500" />
                                      ) : (
                                        <FaChevronRight className="h-3 w-3 text-gray-500" />
                                      )}
                                    </div>
                                    <div className="text-left">
                                      <h4 className="font-semibold text-gray-900">{monthData.monthName}</h4>
                                      <p className="text-xs text-gray-500">
                                        {Object.values(monthData.weeks).reduce((sum, week) => 
                                          sum + week.outbounds.length, 0
                                        )} campaigns
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {Object.keys(monthData.weeks).length} weeks
                                  </div>
                                </button>

                                {/* Month Content */}
                                {isMonthExpanded && (
                                  <div className="border-t border-gray-100">
                                    {Object.entries(monthData.weeks)
                                      .sort(([a], [b]) => b.localeCompare(a)) // Sort weeks descending
                                      .map(([weekKey, weekData]) => {
                                        const isWeekExpanded = expandedWeeks.has(weekKey)
                                        
                                        return (
                                          <div key={weekKey} className="border-t border-gray-100 first:border-t-0">
                                            {/* Week Accordion Header */}
                                            <button
                                              onClick={() => toggleWeek(weekKey)}
                                              className="w-full p-4 sm:p-5 pl-12 sm:pl-16 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className="p-1 bg-gray-100 rounded">
                                                  {isWeekExpanded ? (
                                                    <FaChevronDown className="h-2.5 w-2.5 text-gray-500" />
                                                  ) : (
                                                    <FaChevronRight className="h-2.5 w-2.5 text-gray-500" />
                                                  )}
                                                </div>
                                                <div className="text-left">
                                                  <h5 className="font-medium text-gray-900">Week {weekData.week}</h5>
                                                  <p className="text-xs text-gray-500">
                                                    {weekData.outbounds.length} campaigns
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Created {new Date(weekData.outbounds[0]?.created_at).toLocaleDateString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric' 
                                                })}
                                              </div>
                                            </button>

                                            {/* Week Content - Outbounds List */}
                                            {isWeekExpanded && (
                                              <div className="border-t border-gray-100 bg-gray-50/50">
                                                <div className="p-4 sm:p-6">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {weekData.outbounds.map((outbound) => (
                                                      <div
                                                        key={outbound.id}
                                                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all hover:border-orange-200 group"
                                                      >
                                                        <div className="flex items-start justify-between mb-3">
                                                          <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                                                              <TbMailForward className="h-4 w-4 text-orange-600" />
                                                            </div>
                                                            <div>
                                                              <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                                                {outbound.name}
                                                              </h3>
                                                              <p className="text-xs text-gray-500">
                                                                {new Date(outbound.created_at).toLocaleDateString('en-US', {
                                                                  weekday: 'short',
                                                                  month: 'short',
                                                                  day: 'numeric',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit'
                                                                })}
                                                              </p>
                                                            </div>
                                                          </div>
                                                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(outbound.status)}`}>
                                                            {getStatusIcon(outbound.status)}
                                                            {getStatusText(outbound.status)}
                                                          </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                                          <div className="text-center p-2 bg-blue-50 rounded-lg">
                                                            <div className="text-lg font-bold text-gray-900">{outbound.task_count || 0}</div>
                                                            <div className="text-xs text-gray-500">Tasks</div>
                                                          </div>
                                                          <div className="text-center p-2 bg-purple-50 rounded-lg">
                                                            <div className="text-lg font-bold text-gray-900">{outbound.email_count || 0}</div>
                                                            <div className="text-xs text-gray-500">Emails</div>
                                                          </div>
                                                        </div>
                                                        
                                                        <div className="flex gap-2">
                                                          <Link
                                                            href={`/dashboard/outbounds/${outbound.id}`}
                                                            className="flex-1 text-center py-2 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 font-medium text-sm rounded-lg hover:from-orange-100 hover:to-red-100 transition-colors"
                                                          >
                                                            View Details
                                                          </Link>
                                                          <button
                                                            onClick={() => handleCreateTask(outbound)}
                                                            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                                            title="Create Task"
                                                          >
                                                            <FaTasks className="h-4 w-4" />
                                                          </button>
                                                          <button
                                                            onClick={() => handleDeleteOutbound(outbound)}
                                                            disabled={deleting === outbound.id}
                                                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                            title="Delete Campaign"
                                                          >
                                                            {deleting === outbound.id ? (
                                                              <FiRefreshCw className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                              <FaTrash className="h-4 w-4" />
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
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