'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../components/AuthProvider'
import {
    RiArrowLeftLine, RiMailLine, RiUserLine, RiFileCopyLine, RiDeleteBinLine,
    RiSearchLine, RiCheckboxBlankLine, RiCheckboxFill, RiArrowDownSLine, RiArrowRightSLine,
    RiErrorWarningLine, RiLoader4Line, RiRestartLine, RiDeleteBin7Line
} from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function EmailListPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const outboundId = params?.id

    const [outbound, setOutbound] = useState(null)
    const [emailAccounts, setEmailAccounts] = useState([])
    const [emailList, setEmailList] = useState([]) // Array of { email, accountId, accountName, accountEmail }
    const [deletedEmails, setDeletedEmails] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('active')
    const [selectedEmails, setSelectedEmails] = useState([])
    const [copiedEmail, setCopiedEmail] = useState(null)
    const [collapsedGroups, setCollapsedGroups] = useState({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [emailToDelete, setEmailToDelete] = useState(null)
    const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
    const [emailToPermanentDelete, setEmailToPermanentDelete] = useState(null)

    useEffect(() => {
        if (!user || !outboundId) return
        fetchData()
    }, [user, outboundId])

    const fetchData = async () => {
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

            // Fetch email accounts
            const { data: accountsData, error: accountsError } = await supabase
                .from('email_accounts')
                .select('id, sender_name, email')
                .eq('user_id', user.id)

            if (accountsError) throw accountsError
            setEmailAccounts(accountsData || [])

            // Parse email list and map to allocations
            const rawEmails = (outboundData.email_list || '').split('\n')
                .map(email => email.trim())
                .filter(email => email.length > 0)

            const allocations = Array.isArray(outboundData.allocations) ? outboundData.allocations : []
            
            // Create account lookup map
            const accountMap = new Map()
            accountsData.forEach(acc => {
                accountMap.set(acc.id, { name: acc.sender_name, email: acc.email })
            })

            // Group emails by account
            const groupedEmails = []
            let emailIndex = 0

            allocations.forEach(allocation => {
                const allocated = allocation.allocated_emails || 0
                const accountInfo = accountMap.get(allocation.account_id) || { name: 'Unknown', email: 'N/A' }
                const groupEmails = []
                
                for (let i = 0; i < allocated && emailIndex < rawEmails.length; i++) {
                    groupEmails.push(rawEmails[emailIndex])
                    emailIndex++
                }

                if (groupEmails.length > 0) {
                    groupedEmails.push({
                        emailAssigned: accountInfo.email,
                        accountName: accountInfo.name,
                        list: groupEmails
                    })
                }
            })

            // Add unallocated emails as a group
            const unallocatedEmails = []
            for (let i = emailIndex; i < rawEmails.length; i++) {
                unallocatedEmails.push(rawEmails[i])
            }

            if (unallocatedEmails.length > 0) {
                groupedEmails.push({
                    emailAssigned: 'Not Allocated',
                    accountName: 'Not Allocated',
                    list: unallocatedEmails
                })
            }

            // Initialize collapsed state for groups
            const initialCollapsedState = {}
            groupedEmails.forEach(group => {
                initialCollapsedState[group.emailAssigned] = false
            })

            setEmailList(groupedEmails)
            setCollapsedGroups(initialCollapsedState)

            // Parse deleted emails
            const deleted = (outboundData.deleted_emails || '').split('\n')
                .map(email => email.trim())
                .filter(email => email.length > 0)
            setDeletedEmails(deleted)

        } catch (err) {
            console.error('Error loading data:', err)
            const message = err?.message || err?.hint || err?.details || 'Failed to load email list.'
            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const toggleGroupCollapse = (groupEmail) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupEmail]: !prev[groupEmail]
        }))
    }

    const copyToClipboard = (email) => {
        try {
            navigator.clipboard.writeText(email)
            setCopiedEmail(email)
            toast.success('Email copied to clipboard')
            setTimeout(() => setCopiedEmail(null), 2000)
        } catch (err) {
            console.error('Failed to copy email:', err)
            toast.error('Failed to copy email')
        }
    }

    const toggleEmailSelection = (email) => {
        setSelectedEmails(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        )
    }

    const toggleGroupSelection = (groupEmail) => {
        const group = emailList.find(g => g.emailAssigned === groupEmail)
        if (!group) {
            toast.error('Group not found')
            return
        }

        const allGroupEmailsSelected = group.list.every(email => selectedEmails.includes(email))

        if (allGroupEmailsSelected) {
            setSelectedEmails(prev => prev.filter(email => !group.list.includes(email)))
        } else {
            const newSelections = new Set([...selectedEmails, ...group.list])
            setSelectedEmails(Array.from(newSelections))
        }
    }

    const handleDeleteEmail = (email) => {
        setEmailToDelete(email)
        setShowDeleteConfirm(true)
    }

    const handleBulkDelete = () => {
        if (selectedEmails.length === 0) {
            toast.error('No emails selected')
            return
        }
        setEmailToDelete(selectedEmails)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!emailToDelete) return
        
        setSaving(true)
        try {
            const emailsToDelete = Array.isArray(emailToDelete) ? emailToDelete : [emailToDelete]
            
            // Track which account each deleted email belongs to
            const accountDeletionCount = new Map()
            
            // Remove from active list and track deletions per account
            const updatedEmailList = emailList.map(group => {
                const deletedFromGroup = group.list.filter(email => emailsToDelete.includes(email))
                const remainingInGroup = group.list.filter(email => !emailsToDelete.includes(email))
                
                // Track deletions for this account (skip "Not Allocated" group)
                if (group.emailAssigned !== 'Not Allocated' && deletedFromGroup.length > 0) {
                    // Find the account_id for this group
                    const account = emailAccounts.find(acc => acc.email === group.emailAssigned)
                    if (account) {
                        const currentCount = accountDeletionCount.get(account.id) || 0
                        accountDeletionCount.set(account.id, currentCount + deletedFromGroup.length)
                    }
                }
                
                return {
                    ...group,
                    list: remainingInGroup
                }
            }).filter(group => group.list.length > 0)

            // Add to deleted list
            const updatedDeletedEmails = [...deletedEmails, ...emailsToDelete]
            setDeletedEmails(updatedDeletedEmails)

            // Update allocations: reduce only the accounts that had emails deleted
            const allocations = outbound.allocations || []
            const newAllocations = allocations.map(allocation => {
                const deletedCount = accountDeletionCount.get(allocation.account_id) || 0
                const newAllocatedCount = Math.max(0, (allocation.allocated_emails || 0) - deletedCount)
                
                return {
                    account_id: allocation.account_id,
                    allocated_emails: newAllocatedCount
                }
            }).filter(alloc => alloc.allocated_emails > 0)

            // Get remaining emails in order (maintaining allocation structure)
            const remainingEmails = updatedEmailList.flatMap(group => group.list)

            // Update outbound in database
            const { error: updateError } = await supabase
                .from('outbounds')
                .update({
                    email_list: remainingEmails.join('\n'),
                    deleted_emails: updatedDeletedEmails.join('\n'),
                    allocations: newAllocations
                })
                .eq('id', outboundId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            // Update local state
            setEmailList(updatedEmailList)
            setSelectedEmails([])

            const message = Array.isArray(emailToDelete) 
                ? `Deleted ${emailToDelete.length} emails successfully`
                : 'Email deleted successfully'
            toast.success(message)

        } catch (err) {
            console.error('Error deleting email:', err)
            toast.error('Failed to delete email: ' + (err.message || 'Unknown error'))
            // Revert on error
            await fetchData()
        } finally {
            setSaving(false)
            setShowDeleteConfirm(false)
            setEmailToDelete(null)
        }
    }

    const handleRestoreEmail = async (emailToRestore) => {
        setSaving(true)
        try {
            // Remove from deleted list
            const updatedDeletedEmails = deletedEmails.filter(email => email !== emailToRestore)
            setDeletedEmails(updatedDeletedEmails)

            // Add to active list (at the end, unallocated)
            const currentEmailList = [...emailList]
            const unallocatedGroup = currentEmailList.find(g => g.emailAssigned === 'Not Allocated')
            
            if (unallocatedGroup) {
                unallocatedGroup.list.push(emailToRestore)
            } else {
                currentEmailList.push({
                    emailAssigned: 'Not Allocated',
                    accountName: 'Not Allocated',
                    list: [emailToRestore]
                })
            }

            setEmailList(currentEmailList)

            // Update outbound
            const allEmails = currentEmailList.flatMap(group => group.list)

            const { error: updateError } = await supabase
                .from('outbounds')
                .update({
                    email_list: allEmails.join('\n'),
                    deleted_emails: updatedDeletedEmails.join('\n')
                })
                .eq('id', outboundId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            toast.success('Email restored successfully')

        } catch (err) {
            console.error('Error restoring email:', err)
            toast.error('Failed to restore email: ' + (err.message || 'Unknown error'))
            await fetchData()
        } finally {
            setSaving(false)
        }
    }

    const handlePermanentDelete = (email) => {
        setEmailToPermanentDelete(email)
        setShowPermanentDeleteConfirm(true)
    }

    const confirmPermanentDelete = async () => {
        if (!emailToPermanentDelete) return

        setSaving(true)
        try {
            const updatedDeletedEmails = deletedEmails.filter(email => email !== emailToPermanentDelete)
            setDeletedEmails(updatedDeletedEmails)

            const { error: updateError } = await supabase
                .from('outbounds')
                .update({
                    deleted_emails: updatedDeletedEmails.join('\n')
                })
                .eq('id', outboundId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            toast.success('Email permanently deleted')

        } catch (err) {
            console.error('Error permanently deleting email:', err)
            toast.error('Failed to permanently delete email: ' + (err.message || 'Unknown error'))
            await fetchData()
        } finally {
            setSaving(false)
            setShowPermanentDeleteConfirm(false)
            setEmailToPermanentDelete(null)
        }
    }

    // Filter emails based on active tab
    const filteredEmailList = activeTab === 'active' 
        ? emailList.map(group => ({
            ...group,
            list: group.list.filter(email =>
                email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.emailAssigned.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.accountName.toLowerCase().includes(searchTerm.toLowerCase())
            )
        })).filter(group => group.list.length > 0)
        : []

    const filteredDeletedEmails = activeTab === 'deleted'
        ? deletedEmails.filter(email =>
            email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : []

    const totalActiveEmails = emailList.reduce((sum, group) => sum + group.list.length, 0)
    const totalFilteredEmails = filteredEmailList.reduce((sum, group) => sum + group.list.length, 0)

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <RiLoader4Line className="animate-spin h-12 w-12 text-indigo-500 mb-4" />
                <p className="text-gray-600">Loading recipient lists...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-4 p-6">
                <button
                    onClick={() => router.push(`/dashboard/outbounds/${outboundId}`)}
                    className="flex items-center text-indigo-600 hover:text-indigo-500 text-sm mb-4"
                >
                    <RiArrowLeftLine className="mr-1" /> Back to Outbound
                </button>
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-center">
                    <RiErrorWarningLine className="mr-2" />
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
                <div>
                    <button
                        onClick={() => router.push(`/dashboard/outbounds/${outboundId}`)}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 mb-2 text-sm sm:text-base"
                    >
                        <RiArrowLeftLine className="mr-1" /> Back to Outbound
                    </button>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                        Email List: {outbound?.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Manage recipient emails and their allocations
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'active'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Active Emails ({totalActiveEmails})
                </button>
                <button
                    onClick={() => setActiveTab('deleted')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'deleted'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Deleted Emails ({deletedEmails.length})
                </button>
            </div>

            {/* Search and Bulk Actions */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <RiSearchLine className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={activeTab === 'active' 
                            ? "Search recipients or sending emails..." 
                            : "Search deleted emails..."}
                        className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {activeTab === 'active' && selectedEmails.length > 0 && (
                    <div className="flex flex-col xs:flex-row xs:items-center gap-3">
                        <span className="text-xs sm:text-sm text-gray-700">
                            {selectedEmails.length} selected
                        </span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={saving}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <RiLoader4Line className="animate-spin mr-1" />
                            ) : (
                                <RiDeleteBinLine className="mr-1" />
                            )}
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Active Emails Tab */}
            {activeTab === 'active' && (
                <div className="space-y-4 sm:space-y-6">
                    {filteredEmailList.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                            <div className="text-center py-8 sm:py-12">
                                <RiMailLine className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                                <h3 className="mt-2 sm:mt-3 text-sm font-medium text-gray-900">
                                    {searchTerm ? 'No matching recipients found' : 'No recipients found'}
                                </h3>
                                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                    {searchTerm
                                        ? 'Try a different search term'
                                        : 'This outbound doesn\'t have any recipients assigned yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filteredEmailList.map((group, groupIndex) => (
                            <div key={groupIndex} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                {/* Group Header */}
                                <div
                                    className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                                    onClick={() => toggleGroupCollapse(group.emailAssigned)}
                                >
                                    <div className="flex items-center min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleGroupSelection(group.emailAssigned)
                                            }}
                                            className="mr-2 sm:mr-3 text-gray-400 hover:text-indigo-600 shrink-0"
                                            aria-label={group.list.every(email => selectedEmails.includes(email)) ? "Deselect all" : "Select all"}
                                        >
                                            {group.list.every(email => selectedEmails.includes(email)) ? (
                                                <RiCheckboxFill className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                            ) : (
                                                <RiCheckboxBlankLine className="h-4 w-4 sm:h-5 sm:w-5" />
                                            )}
                                        </button>
                                        <div className="flex items-center min-w-0">
                                            {collapsedGroups[group.emailAssigned] ? (
                                                <RiArrowRightSLine className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-2 shrink-0" />
                                            ) : (
                                                <RiArrowDownSLine className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-2 shrink-0" />
                                            )}
                                            <RiMailLine className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 mr-2 shrink-0" />
                                            <div className="min-w-0">
                                                <h2 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                                    {group.accountName}
                                                </h2>
                                                <p className="text-xs text-gray-500 truncate">{group.emailAssigned}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center ml-2">
                                        <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 whitespace-nowrap">
                                            {group.list.length} {window.innerWidth < 640 ? '' : 'recipients'}
                                        </span>
                                    </div>
                                </div>

                                {/* Recipient List */}
                                {!collapsedGroups[group.emailAssigned] && (
                                    <div className="divide-y divide-gray-200">
                                        {group.list.map((email, emailIndex) => (
                                            <div key={emailIndex} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex items-center min-w-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleEmailSelection(email)
                                                        }}
                                                        className="mr-2 sm:mr-3 text-gray-400 hover:text-indigo-600 shrink-0"
                                                        aria-label={selectedEmails.includes(email) ? "Deselect email" : "Select email"}
                                                    >
                                                        {selectedEmails.includes(email) ? (
                                                            <RiCheckboxFill className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                                        ) : (
                                                            <RiCheckboxBlankLine className="h-4 w-4 sm:h-5 sm:w-5" />
                                                        )}
                                                    </button>
                                                    <RiUserLine className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 sm:mr-3 shrink-0" />
                                                    <span className="text-gray-700 text-sm sm:text-base truncate">{email}</span>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            copyToClipboard(email)
                                                        }}
                                                        className="text-gray-400 hover:text-indigo-600 p-1 rounded-md"
                                                        title="Copy email"
                                                        aria-label="Copy email"
                                                    >
                                                        <RiFileCopyLine className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteEmail(email)
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 p-1 rounded-md"
                                                        title="Delete email"
                                                        aria-label="Delete email"
                                                    >
                                                        <RiDeleteBinLine className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Deleted Emails Tab */}
            {activeTab === 'deleted' && (
                <div className="space-y-4 sm:space-y-6">
                    {filteredDeletedEmails.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                            <div className="text-center py-8 sm:py-12">
                                <RiDeleteBinLine className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                                <h3 className="mt-2 sm:mt-3 text-sm font-medium text-gray-900">
                                    {searchTerm ? 'No matching deleted emails found' : 'No deleted emails'}
                                </h3>
                                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                    {searchTerm
                                        ? 'Try a different search term'
                                        : 'No emails have been deleted from this outbound.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="divide-y divide-gray-200">
                                {filteredDeletedEmails.map((email, index) => (
                                    <div key={index} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50">
                                        <div className="flex items-center min-w-0">
                                            <RiUserLine className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 sm:mr-3 shrink-0" />
                                            <span className="text-gray-500 text-sm sm:text-base truncate line-through">{email}</span>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <button
                                                onClick={() => handleRestoreEmail(email)}
                                                disabled={saving}
                                                className="text-gray-400 hover:text-green-600 p-1 rounded-md"
                                                title="Restore email"
                                                aria-label="Restore email"
                                            >
                                                <RiRestartLine className="h-3 w-3 sm:h-4 sm:w-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePermanentDelete(email)}
                                                disabled={saving}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded-md"
                                                title="Permanently delete"
                                                aria-label="Permanently delete"
                                            >
                                                <RiDeleteBin7Line className="h-3 w-3 sm:h-4 sm:w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {Array.isArray(emailToDelete) ? "Delete Selected Emails" : "Delete Email"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {Array.isArray(emailToDelete)
                                ? `Are you sure you want to delete ${emailToDelete.length} selected emails? This will move them to the deleted list.`
                                : `Are you sure you want to delete "${emailToDelete}"? This will move it to the deleted list.`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setEmailToDelete(null)
                                }}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirm Modal */}
            {showPermanentDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Permanently Delete Email
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to permanently delete "{emailToPermanentDelete}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowPermanentDeleteConfirm(false)
                                    setEmailToPermanentDelete(null)
                                }}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPermanentDelete}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saving Overlay */}
            {saving && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <RiLoader4Line className="animate-spin h-6 w-6 text-indigo-600" />
                            <span className="text-gray-700">Saving changes...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}