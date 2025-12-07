'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import AddOutboundModal from '../../components/AddOutboundModal'
import CreateTaskModal from '../../components/CreateTaskModal'

export default function OutboundsPage() {
  const { user } = useAuth()
  const [outbounds, setOutbounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedOutbound, setSelectedOutbound] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user) {
      fetchOutbounds()
    }
  }, [user])

  const fetchOutbounds = async () => {
    try {
      const { data, error } = await supabase
        .from('outbounds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOutbounds(data || [])
    } catch (error) {
      console.error('Error fetching outbounds:', error)
    } finally {
      setLoading(false)
    }
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
        // Continue with outbound deletion even if queue deletion fails
      }

      // Then delete associated tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('outbound_id', outbound.id)

      if (tasksError) {
        console.error('Error deleting tasks:', tasksError)
        // Continue with outbound deletion even if tasks deletion fails
      }

      // Finally delete the outbound campaign
      const { error: outboundError } = await supabase
        .from('outbounds')
        .delete()
        .eq('id', outbound.id)
        .eq('user_id', user.id)

      if (outboundError) throw outboundError

      // Refresh the outbounds list
      fetchOutbounds()
      
    } catch (error) {
      console.error('Error deleting outbound:', error)
      alert('Failed to delete campaign: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outbound Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your email campaigns
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Add Outbound
        </button>
      </div>

      {/* Outbounds Table */}
      <div className="bg-white shadow rounded-lg">
        {outbounds.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No outbound campaigns yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first outbound campaign to start sending emails.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
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
                {outbounds.map((outbound) => (
                  <tr key={outbound.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/outbounds/${outbound.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {outbound.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(outbound.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        outbound.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : outbound.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {outbound.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCreateTask(outbound)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-xs"
                        >
                          Create Task
                        </button>
                        <button
                          onClick={() => handleDeleteOutbound(outbound)}
                          disabled={deleting === outbound.id}
                          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting === outbound.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {outbounds.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Total Campaigns: <strong>{outbounds.length}</strong>
            </span>
            <span className="text-gray-600">
              Active: <strong>{outbounds.filter(o => o.status === 'active').length}</strong> | 
              Draft: <strong>{outbounds.filter(o => o.status === 'draft').length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Add Outbound Modal */}
      <AddOutboundModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchOutbounds()
        }}
      />

      {/* Create Task Modal */}
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