'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import {
  FiX,
  FiMail,
  FiList,
  FiUsers,
  FiCheck,
  FiChevronRight,
  FiChevronLeft,
  FiPlus,
  FiSearch,
  FiFilter,
  FiBarChart2,
  FiTarget,
  FiDivide,
  FiTrendingUp,
  FiClock,
  FiDatabase,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiAlertCircle,
  FiInfo,
  FiCalendar,
  FiPackage,
  FiMenu,
  FiChevronDown
} from 'react-icons/fi'
import { HiOutlineChartBar, HiOutlineChip, HiOutlineLightningBolt } from 'react-icons/hi'
import { TbMail, TbMailOpened } from 'react-icons/tb'

// Custom components
const StepIndicator = ({ step, totalSteps, title, description, icon: Icon, currentStep }) => (
  <div className={`flex items-start space-x-3 md:space-x-4 p-3 md:p-0 rounded-lg md:rounded-none ${currentStep === step ? 'bg-gray-50 md:bg-transparent' : ''}`}>
    <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${
      currentStep === step ? 'bg-teal-600 text-white' : 
      currentStep > step ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
    }`}>
      {currentStep > step ? <FiCheck className="h-4 w-4 md:h-5 md:w-5" /> : <Icon className="h-4 w-4 md:h-5 md:w-5" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 hidden md:block">
        Step {step} of {totalSteps}
      </p>
      <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{title}</h4>
      <p className="text-xs md:text-sm text-gray-600 mt-1 hidden sm:block">{description}</p>
    </div>
  </div>
)

const StatBadge = ({ icon: Icon, label, value, color = 'gray', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs md:text-sm',
    lg: 'px-4 py-2 text-sm md:text-base'
  }

  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    orange: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100'
  }

  return (
    <div className={`inline-flex items-center rounded-lg border ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <Icon className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
      <span className="font-medium truncate">{label}:</span>
      <span className="ml-1 font-bold truncate">{value}</span>
    </div>
  )
}

const ProgressBar = ({ current, total, label }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  return (
    <div className="space-y-1 md:space-y-2">
      <div className="flex justify-between text-xs md:text-sm">
        <span className="font-medium text-gray-700 truncate">{label}</span>
        <span className="font-semibold whitespace-nowrap ml-2">
          {current} / {total} ({percentage}%)
        </span>
      </div>
      <div className="h-1.5 md:h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage === 100 ? 'bg-emerald-500' :
            percentage >= 75 ? 'bg-teal-500' :
            percentage >= 50 ? 'bg-amber-500' :
            percentage >= 25 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

const AccountCard = ({ account, selected, onSelect, onAllocationChange, maxAllocation }) => (
  <div className={`p-3 md:p-4 rounded-lg md:rounded-xl border transition-all duration-200 ${
    selected 
      ? 'border-teal-300 bg-teal-50 shadow-sm' 
      : 'border-gray-200 bg-white hover:border-gray-300'
  }`}>
    <div className="flex items-start justify-between mb-2 md:mb-3">
      <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-gray-900 text-sm md:text-base truncate">{account.sender_name}</h4>
          <p className="text-xs text-gray-600 truncate">{account.email}</p>
        </div>
      </div>
      <div className="text-right ml-2 flex-shrink-0">
        <div className="text-xs font-medium text-gray-500">Capacity</div>
        <div className="text-xs md:text-sm font-semibold whitespace-nowrap">
          <span className="text-gray-600">{account.sent_today || 0}</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-teal-600">{account.daily_limit}</span>
        </div>
      </div>
    </div>

    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs md:text-sm text-gray-600">Available</span>
        <span className="text-xs md:text-sm font-semibold text-emerald-600 whitespace-nowrap">
          {account.available_capacity} emails
        </span>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between text-xs md:text-sm">
          <span className="text-gray-600">Allocate</span>
          <span className="font-medium whitespace-nowrap">
            <span className="text-teal-600">{account.allocated_emails}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-600">{account.available_capacity}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max={Math.min(account.available_capacity, maxAllocation)}
            value={account.allocated_emails}
            onChange={(e) => onAllocationChange(parseInt(e.target.value) || 0)}
            className="flex-1 h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <input
            type="number"
            min="0"
            max={Math.min(account.available_capacity, maxAllocation)}
            value={account.allocated_emails}
            onChange={(e) => onAllocationChange(parseInt(e.target.value) || 0)}
            className="w-16 md:w-20 px-2 py-1.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {account.allocated_emails > 0 && (
        <div className="mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-gray-100">
          <div className="flex items-center text-xs">
            <div className="flex-1 text-emerald-600 font-medium truncate">
              ✓ {account.allocated_emails} emails allocated
            </div>
            {account.allocated_emails === account.available_capacity && (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-medium rounded flex-shrink-0 ml-2">
                Full
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)

export default function AddOutboundModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    emailList: '',
    allocations: [],
  })
  const [validationError, setValidationError] = useState('')
  const [bulkAllocation, setBulkAllocation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [showInstructions, setShowInstructions] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileStepper, setShowMobileStepper] = useState(false)

  // Check mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch email accounts when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchEmailAccounts()
      setShowInstructions(true)
    }
  }, [isOpen, user])

  const fetchEmailAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const now = new Date()
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
      
      const accountsWithTodayCount = await Promise.all(
        (data || []).map(async (account) => {
          const { count: sentTodayCount, error: countError } = await supabase
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .eq('status', 'sent')
            .gte('sent_at', startOfToday.toISOString())
            .lte('sent_at', endOfToday.toISOString())

          if (countError) console.error(`Error counting emails for account ${account.id}:`, countError)

          return {
            ...account,
            sent_today: sentTodayCount || 0
          }
        })
      )
      
      setEmailAccounts(accountsWithTodayCount)
    } catch (error) {
      console.error('Error fetching email accounts:', error)
    }
  }

  const validateEmailList = (emailList) => {
    const emails = emailList.split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    const invalidEmails = emails.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return !emailRegex.test(email)
    })

    return {
      valid: invalidEmails.length === 0,
      emails,
      invalidEmails
    }
  }

  const initializeAllocations = () => {
    const validation = validateEmailList(formData.emailList)
    if (!validation.valid) return false

    const availableAccounts = emailAccounts.filter(account => account.active)
    
    if (availableAccounts.length === 0) {
      setValidationError('No active email accounts available')
      return false
    }

    const initialAllocations = availableAccounts.map(account => ({
      account_id: account.id,
      sender_name: account.sender_name,
      email: account.email,
      daily_limit: account.daily_limit,
      sent_today: account.sent_today || 0,
      available_capacity: account.daily_limit,
      allocated_emails: 0,
      selected: false
    }))

    setFormData(prev => ({ ...prev, allocations: initialAllocations }))
    return true
  }

  const handleAllocationChange = (accountId, value) => {
    const numValue = parseInt(value) || 0
    const totalEmails = getTotalEmails()
    const currentAllocation = getTotalAllocated()
    
    const account = formData.allocations.find(acc => acc.account_id === accountId)
    if (!account) return

    const currentAccountAllocation = account.allocated_emails
    const potentialNewTotal = currentAllocation - currentAccountAllocation + numValue

    if (potentialNewTotal > totalEmails) {
      const maxAllowed = numValue - (potentialNewTotal - totalEmails)
      setValidationError(`Cannot allocate more than ${totalEmails} total emails. Maximum allowed: ${Math.min(maxAllowed, account.available_capacity)}`)
      return
    }

    const finalAllocation = Math.min(numValue, account.available_capacity)
    
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(allocation => 
        allocation.account_id === accountId 
          ? { ...allocation, allocated_emails: finalAllocation }
          : allocation
      )
    }))
    setValidationError('')
  }

  const handleBulkAllocation = () => {
    const numValue = parseInt(bulkAllocation) || 0
    if (numValue <= 0) {
      setValidationError('Please enter a positive number for bulk allocation')
      return
    }

    const selectedAccounts = formData.allocations.filter(acc => acc.selected)
    if (selectedAccounts.length === 0) {
      setValidationError('Please select at least one email account')
      return
    }

    const totalEmails = getTotalEmails()
    const currentAllocation = getTotalAllocated()
    const remainingEmails = totalEmails - currentAllocation

    if (remainingEmails <= 0) {
      setValidationError('All emails have already been allocated')
      return
    }

    const totalPotentialAllocation = selectedAccounts.reduce((sum, account) => {
      const availableForAccount = Math.min(account.available_capacity, numValue)
      return sum + availableForAccount
    }, 0)

    if (totalPotentialAllocation > remainingEmails) {
      const scaleFactor = remainingEmails / totalPotentialAllocation
      selectedAccounts.forEach(account => {
        const allocated = Math.floor(Math.min(account.available_capacity, numValue) * scaleFactor)
        const finalAllocation = Math.max(0, allocated)
        handleAllocationChange(account.account_id, finalAllocation)
      })
    } else {
      selectedAccounts.forEach(account => {
        const finalAllocation = Math.min(account.available_capacity, numValue)
        handleAllocationChange(account.account_id, finalAllocation)
      })
    }

    setBulkAllocation('')
    setValidationError('')
  }

  const handleSelectAll = (selected) => {
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(allocation => ({
        ...allocation,
        selected
      }))
    }))
  }

  const handleSelectAccount = (accountId, selected) => {
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(allocation => 
        allocation.account_id === accountId 
          ? { ...allocation, selected }
          : allocation
      )
    }))
  }

  const getTotalAllocated = () => {
    return formData.allocations.reduce((sum, allocation) => sum + allocation.allocated_emails, 0)
  }

  const getTotalEmails = () => {
    return formData.emailList.split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .length
  }

  const applyQuickAllocation = (strategy) => {
    const totalEmails = getTotalEmails()
    const currentAllocation = getTotalAllocated()
    const remainingEmails = totalEmails - currentAllocation
    
    if (remainingEmails <= 0) {
      setValidationError('All emails have already been allocated')
      return
    }

    let accountsToUpdate = formData.allocations
      .filter(acc => acc.available_capacity > 0)

    if (strategy === 'equal') {
      const equalShare = Math.floor(remainingEmails / accountsToUpdate.length)
      let distributed = 0
      
      accountsToUpdate.forEach((account, index) => {
        const maxPossible = Math.min(account.available_capacity, equalShare)
        const isLastAccount = index === accountsToUpdate.length - 1
        const finalAllocation = isLastAccount 
          ? Math.min(account.available_capacity, remainingEmails - distributed)
          : maxPossible
        
        handleAllocationChange(account.account_id, account.allocated_emails + finalAllocation)
        distributed += finalAllocation
      })
    } else if (strategy === 'capacity') {
      const totalCapacity = accountsToUpdate.reduce((sum, acc) => sum + acc.available_capacity, 0)
      let distributed = 0
      
      accountsToUpdate.forEach((account, index) => {
        const proportion = account.available_capacity / totalCapacity
        const additional = Math.floor(remainingEmails * proportion)
        const isLastAccount = index === accountsToUpdate.length - 1
        const finalAdditional = isLastAccount 
          ? Math.min(account.available_capacity - account.allocated_emails, remainingEmails - distributed)
          : Math.min(account.available_capacity - account.allocated_emails, additional)
        
        handleAllocationChange(account.account_id, account.allocated_emails + finalAdditional)
        distributed += finalAdditional
      })
    } else if (strategy === 'fill') {
      let emailsLeft = remainingEmails
      accountsToUpdate.forEach(account => {
        if (emailsLeft > 0) {
          const canTake = Math.min(account.available_capacity - account.allocated_emails, emailsLeft)
          if (canTake > 0) {
            handleAllocationChange(account.account_id, account.allocated_emails + canTake)
            emailsLeft -= canTake
          }
        }
      })
    }
    
    setValidationError('')
  }

  const filteredAccounts = formData.allocations.filter(account =>
    account.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        setValidationError('Campaign name is required')
        return
      }

      const validation = validateEmailList(formData.emailList)
      if (!validation.valid) {
        setValidationError(`Invalid email addresses: ${validation.invalidEmails.join(', ')}`)
        return
      }

      if (validation.emails.length === 0) {
        setValidationError('Please enter at least one email address')
        return
      }

      if (emailAccounts.length === 0) {
        setValidationError('You need to add at least one email account before creating a campaign')
        return
      }

      if (!initializeAllocations()) {
        return
      }

      setValidationError('')
      setStep(2)
    } else if (step === 2) {
      const totalAllocated = getTotalAllocated()
      const totalEmails = getTotalEmails()

      if (totalAllocated === 0) {
        setValidationError('Please allocate at least one email to an account')
        return
      }

      if (totalAllocated !== totalEmails) {
        setValidationError(`You must allocate ALL ${totalEmails} emails. Currently allocated: ${totalAllocated}. Please allocate the remaining ${totalEmails - totalAllocated} emails.`)
        return
      }

      const overAllocated = formData.allocations.find(allocation => 
        allocation.allocated_emails > allocation.available_capacity
      )

      if (overAllocated) {
        setValidationError(
          `${overAllocated.sender_name} is allocated ${overAllocated.allocated_emails} emails but the daily limit is ${overAllocated.available_capacity} emails per day`
        )
        return
      }

      setValidationError('')
      setStep(3)
    } else if (step === 3) {
      handleSaveOutbound()
    }
  }

  const handleSaveOutbound = async () => {
    setLoading(true)
    try {
      const { error: outboundError } = await supabase
        .from('outbounds')
        .insert({
          user_id: user.id,
          name: formData.name,
          status: 'draft',
          email_list: formData.emailList,
          allocations: formData.allocations,
        })

      if (outboundError) throw outboundError

      onSuccess()
    } catch (error) {
      console.error('Error saving outbound:', error)
      setValidationError('Failed to save campaign: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setFormData({
      name: '',
      emailList: '',
      allocations: []
    })
    setValidationError('')
    setBulkAllocation('')
    setSearchTerm('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}></div>

        {/* Modal */}
        <div className="relative bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-full md:max-w-6xl max-h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
              <div className="p-2 md:p-3 bg-gray-100 rounded-lg md:rounded-xl">
                <HiOutlineLightningBolt className="h-5 w-5 md:h-7 md:w-7 text-gray-700" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-2xl font-bold text-gray-900 truncate">Create New Campaign</h3>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5 hidden sm:block">
                  Build your outbound email campaign in 3 simple steps
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <FiX className="h-5 w-5 md:h-6 md:w-6 text-gray-500" />
            </button>
          </div>

          {/* Mobile Stepper Toggle */}
          {isMobile && (
            <button
              onClick={() => setShowMobileStepper(!showMobileStepper)}
              className="md:hidden flex items-center justify-between w-full p-3 bg-gray-50 border-b border-gray-200"
            >
              <span className="font-medium text-sm">
                Step {step} of 3: {step === 1 ? 'Campaign Setup' : step === 2 ? 'Email Allocation' : 'Review & Create'}
              </span>
              <FiChevronDown className={`h-4 w-4 transform transition-transform ${showMobileStepper ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Content */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Sidebar - Stepper */}
            <div className={`${isMobile ? (showMobileStepper ? 'block' : 'hidden') : 'block'} md:block w-full md:w-72 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 p-3 md:p-4 lg:p-6 overflow-y-auto`}>
              <div className="space-y-4 md:space-y-8">
                <StepIndicator
                  step={1}
                  totalSteps={3}
                  title="Campaign Setup"
                  description="Name your campaign and add recipient emails"
                  icon={FiPackage}
                  currentStep={step}
                />
                <StepIndicator
                  step={2}
                  totalSteps={3}
                  title="Email Allocation"
                  description="Distribute emails across your sending accounts"
                  icon={FiTarget}
                  currentStep={step}
                />
                <StepIndicator
                  step={3}
                  totalSteps={3}
                  title="Review & Create"
                  description="Review settings and launch your campaign"
                  icon={FiCheck}
                  currentStep={step}
                />
              </div>

              {/* Stats Summary */}
              <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-2 md:mb-3">Campaign Summary</h5>
                <div className="space-y-2 md:space-y-3">
                  <div className="text-xs md:text-sm">
                    <div className="text-gray-600 truncate">Campaign Name</div>
                    <div className="font-medium truncate">{formData.name || 'Not set'}</div>
                  </div>
                  <div className="text-xs md:text-sm">
                    <div className="text-gray-600">Total Recipients</div>
                    <div className="font-medium">{getTotalEmails() || 0}</div>
                  </div>
                  <div className="text-xs md:text-sm">
                    <div className="text-gray-600">Accounts Used</div>
                    <div className="font-medium">
                      {formData.allocations.filter(a => a.allocated_emails > 0).length || 0}
                    </div>
                  </div>
                  <div className="pt-1 md:pt-2">
                    <ProgressBar
                      current={getTotalAllocated()}
                      total={getTotalEmails() || 1}
                      label="Allocation Progress"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
              {validationError && (
                <div className="mb-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-400 rounded-lg md:rounded-xl">
                  <div className="flex items-start">
                    <FiAlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-400 mt-0.5 mr-2 md:mr-3 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-red-800 text-sm md:text-base">Action Required</p>
                      <p className="text-xs md:text-sm text-red-700 mt-0.5 md:mt-1 break-words">{validationError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 Content */}
              {step === 1 && (
                <div className="space-y-4 md:space-y-6">
                  {showInstructions && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg md:rounded-xl p-3 md:p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-blue-900 text-sm md:text-base">📋 Campaign Setup Guide</p>
                          <p className="text-xs md:text-sm text-blue-700 mt-0.5 md:mt-1">
                            Enter your campaign name and recipient emails (one per line). 
                            All emails will be distributed across your sending accounts in the next step.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowInstructions(false)}
                          className="ml-2 md:ml-4 text-blue-500 hover:text-blue-700 flex-shrink-0"
                        >
                          <FiX className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1.5 md:mb-2">
                        <FiPackage className="inline mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 text-base md:text-lg border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                        placeholder="Q4 Sales Outreach 2024"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2">
                        <label className="block text-sm font-semibold text-gray-900">
                          <FiMail className="inline mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                          Recipient Email List *
                        </label>
                        <span className="text-xs md:text-sm font-medium text-gray-600 whitespace-nowrap ml-2">
                          {getTotalEmails()} emails
                        </span>
                      </div>
                      <div className="border border-gray-300 rounded-lg md:rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                        <textarea
                          rows="6"
                          required
                          className="w-full px-3 md:px-4 py-2.5 md:py-3 border-0 focus:outline-none font-mono text-xs md:text-sm resize-none min-h-[150px] md:min-h-[200px]"
                          placeholder="john@example.com&#10;jane@company.com&#10;mark@gmail.com"
                          value={formData.emailList}
                          onChange={(e) => setFormData({ ...formData, emailList: e.target.value })}
                        />
                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                          Enter one email address per line
                        </div>
                      </div>
                    </div>

                    {/* Available Accounts Preview */}
                    <div className="border border-gray-200 rounded-lg md:rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 text-sm md:text-base flex items-center">
                          <FiUsers className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                          Available Sending Accounts ({emailAccounts.length})
                        </h4>
                      </div>
                      {emailAccounts.length === 0 ? (
                        <div className="p-4 md:p-6 text-center">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <FiMail className="h-5 w-5 md:h-8 md:w-8 text-gray-400" />
                          </div>
                          <p className="mt-2 md:mt-4 text-gray-600 font-medium text-sm md:text-base">No email accounts found</p>
                          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">
                            Add email accounts in Settings to start sending campaigns
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-48 overflow-y-auto">
                          {emailAccounts.slice(0, 4).map(account => (
                            <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-2 md:p-3">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-xs md:text-sm truncate">{account.sender_name}</p>
                                  <p className="text-xs text-gray-600 truncate">{account.email}</p>
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                  <div className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                    {account.sent_today || 0}/{account.daily_limit}
                                  </div>
                                  <div className="text-xs text-emerald-600 font-semibold whitespace-nowrap">
                                    {account.daily_limit} capacity
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {emailAccounts.length > 4 && (
                            <div className="col-span-1 sm:col-span-2 text-center py-1 md:py-2 text-xs md:text-sm text-gray-500">
                              + {emailAccounts.length - 4} more accounts available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 Content */}
              {step === 2 && (
                <div className="space-y-4 md:space-y-6">
                  {/* Header Stats */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                      <div className="flex flex-wrap gap-2">
                        <StatBadge
                          icon={TbMail}
                          label="Total Emails"
                          value={getTotalEmails()}
                          color="teal"
                          className="flex-1 sm:flex-none"
                        />
                        <StatBadge
                          icon={FiCheck}
                          label="Allocated"
                          value={getTotalAllocated()}
                          color={getTotalAllocated() === getTotalEmails() ? 'green' : 'orange'}
                          className="flex-1 sm:flex-none"
                        />
                        <StatBadge
                          icon={FiAlertCircle}
                          label="Remaining"
                          value={getTotalEmails() - getTotalAllocated()}
                          color="orange"
                          className="flex-1 sm:flex-none"
                        />
                      </div>
                      {getTotalAllocated() === getTotalEmails() && (
                        <div className="inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 bg-emerald-100 text-emerald-800 text-xs md:text-sm font-medium rounded-full mt-2 sm:mt-0">
                          <FiCheck className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                          All emails allocated ✓
                        </div>
                      )}
                    </div>
                    <div className="mt-3 md:mt-4">
                      <ProgressBar
                        current={getTotalAllocated()}
                        total={getTotalEmails()}
                        label="Allocation Progress"
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 space-y-3 md:space-y-4">
                    <div className="flex flex-col gap-3 md:gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-900 mb-1.5 md:mb-2">
                          <FiDivide className="inline mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                          Bulk Allocation
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter number of emails"
                            className="flex-1 px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                            value={bulkAllocation}
                            onChange={(e) => setBulkAllocation(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={handleBulkAllocation}
                            className="px-3 md:px-5 py-2 md:py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-200 text-sm whitespace-nowrap"
                          >
                            Apply to Selected
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 md:mt-2">
                          Allocate the same number of emails to all selected accounts
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(true)}
                          className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAll(false)}
                          className="flex-1 sm:flex-none px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Quick Allocation */}
                    <div className="pt-3 md:pt-4 border-t border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-2 md:mb-3">
                        <HiOutlineChartBar className="inline mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        Quick Allocation Strategies
                      </label>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        <button
                          type="button"
                          onClick={() => applyQuickAllocation('equal')}
                          className="flex-1 min-w-[calc(50%-0.375rem)] sm:flex-none px-3 md:px-4 py-2 bg-blue-50 text-blue-700 text-xs md:text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                          <FiDivide className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                          Distribute Equally
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickAllocation('capacity')}
                          className="flex-1 min-w-[calc(50%-0.375rem)] sm:flex-none px-3 md:px-4 py-2 bg-emerald-50 text-emerald-700 text-xs md:text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center"
                        >
                          <FiBarChart2 className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                          By Capacity %
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickAllocation('fill')}
                          className="flex-1 min-w-[calc(50%-0.375rem)] sm:flex-none px-3 md:px-4 py-2 bg-purple-50 text-purple-700 text-xs md:text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center"
                        >
                          <FiTrendingUp className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                          Fill Sequentially
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectAll(false)
                            setFormData(prev => ({
                              ...prev,
                              allocations: prev.allocations.map(acc => ({ ...acc, allocated_emails: 0 }))
                            }))
                          }}
                          className="flex-1 min-w-[calc(50%-0.375rem)] sm:flex-none px-3 md:px-4 py-2 bg-red-50 text-red-700 text-xs md:text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                        >
                          <FiRefreshCw className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                          Reset All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search and View Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1 relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                        {filteredAccounts.length} accounts
                      </span>
                      <div className="flex bg-gray-100 p-0.5 md:p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setViewMode('grid')}
                          className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-md transition-colors whitespace-nowrap ${
                            viewMode === 'grid' 
                              ? 'bg-white text-teal-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Grid
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-md transition-colors whitespace-nowrap ${
                            viewMode === 'table' 
                              ? 'bg-white text-teal-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Table
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Accounts Grid/Table */}
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
                      {filteredAccounts.map((account) => (
                        <AccountCard
                          key={account.account_id}
                          account={account}
                          selected={account.selected}
                          onSelect={(selected) => handleSelectAccount(account.account_id, selected)}
                          onAllocationChange={(value) => handleAllocationChange(account.account_id, value)}
                          maxAllocation={getTotalEmails() - getTotalAllocated() + account.allocated_emails}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg md:rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-3 w-3 md:h-4 md:w-4"
                                  checked={formData.allocations.length > 0 && formData.allocations.every(acc => acc.selected)}
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                              </th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Account
                              </th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Capacity
                              </th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Available
                              </th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Allocated
                              </th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAccounts.map((account) => (
                              <tr key={account.account_id} className="hover:bg-gray-50">
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-3 w-3 md:h-4 md:w-4"
                                    checked={account.selected || false}
                                    onChange={(e) => handleSelectAccount(account.account_id, e.target.checked)}
                                  />
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-xs md:text-sm truncate">
                                      {account.sender_name}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate">
                                      {account.email}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  <div className="text-xs md:text-sm whitespace-nowrap">
                                    {account.sent_today}/{account.daily_limit}
                                  </div>
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  <div className="font-medium text-emerald-600 text-xs md:text-sm">
                                    {account.available_capacity}
                                  </div>
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  <div className="flex items-center gap-1 md:gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={Math.min(account.available_capacity, getTotalEmails() - getTotalAllocated() + account.allocated_emails)}
                                      className="w-16 md:w-20 px-1.5 md:px-2 py-1 md:py-1.5 border border-gray-300 rounded text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                      value={account.allocated_emails}
                                      onChange={(e) => handleAllocationChange(account.account_id, e.target.value)}
                                    />
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                      / {account.available_capacity}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                  {account.allocated_emails > account.available_capacity ? (
                                    <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                                      Over capacity
                                    </span>
                                  ) : account.allocated_emails > 0 ? (
                                    <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">
                                      {account.allocated_emails} allocated
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 whitespace-nowrap">
                                      Not allocated
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {filteredAccounts.length === 0 && (
                    <div className="text-center py-6 md:py-12">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <FiSearch className="h-5 w-5 md:h-8 md:w-8 text-gray-400" />
                      </div>
                      <p className="mt-2 md:mt-4 text-gray-600 font-medium text-sm md:text-base">No accounts found</p>
                      <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">
                        Try adjusting your search criteria
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 Content */}
              {step === 3 && (
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg md:rounded-2xl p-3 md:p-4 lg:p-6">
                    <div className="flex items-start">
                      <div className="p-2 md:p-3 bg-emerald-100 rounded-lg md:rounded-xl mr-2 md:mr-4">
                        <FiCheck className="h-5 w-5 md:h-7 md:w-7 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base md:text-xl font-bold text-gray-900">Campaign Ready to Launch! 🚀</h4>
                        <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-2">
                          Your campaign has been configured successfully. Review the details below and create your campaign.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                    {/* Campaign Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5">
                      <h5 className="font-semibold text-gray-900 text-sm md:text-base mb-2 md:mb-4 flex items-center">
                        <FiPackage className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        Campaign Summary
                      </h5>
                      <div className="space-y-2 md:space-y-4">
                        <div>
                          <label className="text-xs md:text-sm text-gray-600">Campaign Name</label>
                          <p className="font-medium text-sm md:text-lg text-gray-900 truncate">{formData.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:gap-4">
                          <div>
                            <label className="text-xs md:text-sm text-gray-600">Total Recipients</label>
                            <p className="font-bold text-xl md:text-2xl text-teal-600">{getTotalEmails()}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm text-gray-600">Accounts Used</label>
                            <p className="font-bold text-xl md:text-2xl text-emerald-600">
                              {formData.allocations.filter(a => a.allocated_emails > 0).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Allocation Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5">
                      <h5 className="font-semibold text-gray-900 text-sm md:text-base mb-2 md:mb-4 flex items-center">
                        <FiTarget className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        Allocation Summary
                      </h5>
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Total Allocated</span>
                          <span className="font-bold text-emerald-600 text-sm md:text-base">{getTotalAllocated()} emails</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Distribution Method</span>
                          <span className="font-medium text-xs md:text-sm">Manual Allocation</span>
                        </div>
                        <div className="pt-2 md:pt-3 border-t border-gray-100">
                          <ProgressBar
                            current={getTotalAllocated()}
                            total={getTotalEmails()}
                            label="Allocation Progress"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Allocations Detail */}
                  <div className="bg-white border border-gray-200 rounded-lg md:rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-3 md:px-4 lg:px-5 py-2 md:py-3 border-b border-gray-200">
                      <h5 className="font-semibold text-gray-900 text-sm md:text-base flex items-center">
                        <FiUsers className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                        Account Allocations ({formData.allocations.filter(a => a.allocated_emails > 0).length})
                      </h5>
                    </div>
                    <div className="divide-y max-h-48 md:max-h-64 overflow-y-auto">
                      {formData.allocations
                        .filter(allocation => allocation.allocated_emails > 0)
                        .map((allocation, index) => (
                          <div key={allocation.account_id} className="p-2 md:p-3 lg:p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                                <div className="p-1.5 md:p-2 bg-teal-50 rounded-lg flex-shrink-0">
                                  <TbMail className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-teal-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 text-xs md:text-sm truncate">{allocation.sender_name}</p>
                                  <p className="text-xs text-gray-600 truncate">{allocation.email}</p>
                                </div>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                <p className="text-sm md:text-base lg:text-lg font-bold text-teal-600 whitespace-nowrap">
                                  {allocation.allocated_emails} emails
                                </p>
                                <p className="text-xs text-gray-500 whitespace-nowrap">
                                  Daily limit: {allocation.available_capacity}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 md:p-4 lg:p-6 bg-white">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                className="flex items-center px-3 md:px-4 lg:px-5 py-1.5 md:py-2 lg:py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm"
              >
                <FiChevronLeft className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4">
                <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                  Step {step} of 3
                </div>
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={loading || (step === 2 && getTotalAllocated() !== getTotalEmails())}
                  className="flex items-center px-4 md:px-5 lg:px-6 py-1.5 md:py-2 lg:py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1.5 md:mr-2"></div>
                      Creating...
                    </>
                  ) : step < 3 ? (
                    <>
                      Continue
                      <FiChevronRight className="ml-1.5 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
                    </>
                  ) : (
                    <>
                      <FiCheck className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}