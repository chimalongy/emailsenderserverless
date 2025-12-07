'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

export default function AddOutboundModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    emailList: '',
    allocations: [], // frontend-only structure used to build outbound config
  })
  const [validationError, setValidationError] = useState('')
  const [bulkAllocation, setBulkAllocation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch email accounts when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchEmailAccounts()
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
      
      // Get today's date range (start of day to end of day in UTC)
      const now = new Date()
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
      
      // For each account, count emails sent today from email_queue
      const accountsWithTodayCount = await Promise.all(
        (data || []).map(async (account) => {
          // Count emails sent today for this account
          const { count: sentTodayCount, error: countError } = await supabase
            .from('email_queue')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .eq('status', 'sent')
            .gte('sent_at', startOfToday.toISOString())
            .lte('sent_at', endOfToday.toISOString())

          if (countError) {
            console.error(`Error counting emails for account ${account.id}:`, countError)
          }

          // Return account with actual sent_today count from today
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

  // Initialize allocations when moving to step 2
  const initializeAllocations = () => {
    const validation = validateEmailList(formData.emailList)
    if (!validation.valid) return false

    const totalEmails = validation.emails.length
    const availableAccounts = emailAccounts.filter(account => account.active)
    
    if (availableAccounts.length === 0) {
      setValidationError('No active email accounts available')
      return false
    }

    // Initialize allocations with zero for each account
    // available_capacity is set to daily_limit (not reduced by sent_today)
    // This allows allocation based on full daily capacity, regardless of emails already sent today
    const initialAllocations = availableAccounts.map(account => ({
      account_id: account.id,
      sender_name: account.sender_name,
      email: account.email,
      daily_limit: account.daily_limit,
      sent_today: account.sent_today || 0, // For display only, not used in capacity calculation
      available_capacity: account.daily_limit, // Full daily limit, not reduced by sent_today
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
    
    // Find the account being updated
    const account = formData.allocations.find(acc => acc.account_id === accountId)
    if (!account) return

    // Calculate the new total if this change were applied
    const currentAccountAllocation = account.allocated_emails
    const potentialNewTotal = currentAllocation - currentAccountAllocation + numValue

    // Prevent allocation from exceeding total emails
    if (potentialNewTotal > totalEmails) {
      const maxAllowed = numValue - (potentialNewTotal - totalEmails)
      setValidationError(`Cannot allocate more than ${totalEmails} total emails. Maximum allowed for this account: ${Math.min(maxAllowed, account.available_capacity)}`)
      return
    }

    // Ensure allocation doesn't exceed account capacity
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

    // Calculate total potential allocation
    const totalPotentialAllocation = selectedAccounts.reduce((sum, account) => {
      const availableForAccount = Math.min(account.available_capacity, numValue)
      return sum + availableForAccount
    }, 0)

    if (totalPotentialAllocation > remainingEmails) {
      // Distribute proportionally to stay within limits
      const scaleFactor = remainingEmails / totalPotentialAllocation
      selectedAccounts.forEach(account => {
        const allocated = Math.floor(Math.min(account.available_capacity, numValue) * scaleFactor)
        const finalAllocation = Math.max(0, allocated)
        handleAllocationChange(account.account_id, finalAllocation)
      })
    } else {
      // Apply the full allocation
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

  const getSelectedAccounts = () => {
    return formData.allocations.filter(acc => acc.selected)
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
      // Fill accounts sequentially until all emails are allocated
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
      // Validate step 1
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

      // Initialize allocations for step 2
      if (!initializeAllocations()) {
        return
      }

      setValidationError('')
      setStep(2)
    } else if (step === 2) {
      // Validate step 2 - ALL emails must be allocated
      const totalAllocated = getTotalAllocated()
      const totalEmails = getTotalEmails()

      if (totalAllocated === 0) {
        setValidationError('Please allocate at least one email to an account')
        return
      }

      // CRITICAL: All emails must be allocated
      if (totalAllocated !== totalEmails) {
        setValidationError(`You must allocate ALL ${totalEmails} emails. Currently allocated: ${totalAllocated}. Please allocate the remaining ${totalEmails - totalAllocated} emails.`)
        return
      }

      // Check if any allocation exceeds daily limit (available capacity)
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
    /**
     * IMPORTANT: This now only creates the outbound record.
     * It does NOT create any email_queue rows.
     *
     * The recipient list and allocation config are stored on the outbound,
     * so that each task can build its own queue entries independently.
     *
     * Make sure your Supabase `outbounds` table has these columns:
     * - email_list: text
     * - allocations: jsonb
     */
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Add Outbound Campaign</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          {/* Stepper */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepNumber
                      ? 'bg-indigo-600 text-white'
                      : step > stepNumber
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > stepNumber ? '✓' : stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step > stepNumber ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Outbound Info</span>
              <span>Allocation</span>
              <span>Review</span>
            </div>
          </div>

          {/* Error Message */}
          {validationError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          )}

          {/* Step 1: Outbound Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Campaign Information</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Q4 Outreach Campaign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email List *
                </label>
                <textarea
                  rows="8"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="example1@gmail.com&#10;example2@gmail.com&#10;example3@gmail.com"
                  value={formData.emailList}
                  onChange={(e) => setFormData({ ...formData, emailList: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter one email address per line. {formData.emailList && `Found ${getTotalEmails()} emails.`}
                </p>
              </div>

              {/* Available Email Accounts */}
              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Available Email Accounts ({emailAccounts.length})
                </h5>
                {emailAccounts.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      No active email accounts found. Please add email accounts first.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {emailAccounts.map(account => (
                      <div key={account.id} className="bg-gray-50 rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{account.sender_name}</p>
                            <p className="text-xs text-gray-600">{account.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">
                              {account.sent_today || 0}/{account.daily_limit} sent today
                            </p>
                            <p className="text-xs text-green-600">
                              {account.daily_limit} max capacity
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Table-based Manual Allocation */}
          {step === 2 && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">Manual Email Allocation</h4>
              
              {/* Allocation Summary */}
              <div className={`border rounded-md p-4 ${
                getTotalAllocated() === getTotalEmails() 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Total Emails to Distribute: {getTotalEmails()}
                    </p>
                    <p className={`text-sm ${
                      getTotalAllocated() === getTotalEmails() 
                        ? 'text-green-600 font-semibold' 
                        : 'text-blue-600'
                    }`}>
                      Currently Allocated: {getTotalAllocated()} / {getTotalEmails()}
                    </p>
                    {getTotalAllocated() < getTotalEmails() && (
                      <p className="text-sm text-orange-600 mt-1">
                        ⚠️ You must allocate all {getTotalEmails()} emails before proceeding
                      </p>
                    )}
                  </div>
                  {getTotalAllocated() !== getTotalEmails() && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {getTotalEmails() - getTotalAllocated()} remaining
                    </span>
                  )}
                  {getTotalAllocated() === getTotalEmails() && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ All emails allocated
                    </span>
                  )}
                </div>
              </div>

              {/* Bulk Allocation Controls */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bulk Allocation
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter number of emails"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={bulkAllocation}
                        onChange={(e) => setBulkAllocation(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleBulkAllocation}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                      >
                        Apply to Selected
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getSelectedAccounts().length} account(s) selected
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Quick Allocation Buttons */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Allocation Strategies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyQuickAllocation('equal')}
                      className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Distribute Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickAllocation('capacity')}
                      className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Distribute by Capacity
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickAllocation('fill')}
                      className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
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
                      className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Clear All Allocations
                    </button>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex justify-between items-center">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search accounts by name or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-500">
                  Showing {filteredAccounts.length} of {formData.allocations.length} accounts
                </div>
              </div>

              {/* Accounts Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={formData.allocations.length > 0 && formData.allocations.every(acc => acc.selected)}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Available
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Allocate
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAccounts.map((account) => (
                        <tr key={account.account_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={account.selected || false}
                              onChange={(e) => handleSelectAccount(account.account_id, e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {account.sender_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {account.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account.sent_today}/{account.daily_limit}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {account.available_capacity}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max={Math.min(account.available_capacity, getTotalEmails() - getTotalAllocated() + account.allocated_emails)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                value={account.allocated_emails}
                                onChange={(e) => handleAllocationChange(account.account_id, e.target.value)}
                              />
                              <span className="text-xs text-gray-500">
                                / {account.available_capacity}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {account.allocated_emails > account.available_capacity ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Over capacity
                              </span>
                            ) : account.allocated_emails > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Allocated
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
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

              {filteredAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No accounts match your search criteria
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">Review & Save</h4>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">✓ Campaign Ready</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Campaign Name:</span>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Emails:</span>
                    <p className="font-medium">{getTotalEmails()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Accounts Used:</span>
                    <p className="font-medium">
                      {formData.allocations.filter(a => a.allocated_emails > 0).length}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Allocated:</span>
                    <p className="font-medium text-green-600">{getTotalAllocated()}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h5 className="font-medium text-gray-900">Allocation Details</h5>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {formData.allocations
                    .filter(allocation => allocation.allocated_emails > 0)
                    .map((allocation, index) => (
                      <div key={allocation.account_id} className="px-4 py-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{allocation.sender_name}</p>
                            <p className="text-sm text-gray-600">{allocation.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-indigo-600">
                              {allocation.allocated_emails} emails
                            </p>
                            <p className="text-xs text-gray-500">
                              Daily limit: {allocation.available_capacity} emails
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              disabled={loading || (step === 2 && getTotalAllocated() !== getTotalEmails())}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : step < 3 ? 'Next' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}