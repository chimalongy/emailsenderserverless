'use client'

import { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

export default function EditDomainModal({ domain, isOpen, onClose, onUpdateDomain }) {
  const [editingDomain, setEditingDomain] = useState(null)

  useEffect(() => {
    if (domain) {
      setEditingDomain({ ...domain })
    }
  }, [domain])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!editingDomain.name.trim()) {
      alert('Please enter a domain name')
      return
    }

    onUpdateDomain(editingDomain)
    onClose()
  }

  if (!isOpen || !editingDomain) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Edit Domain</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain Name *
              </label>
              <input
                type="text"
                required
                value={editingDomain.name}
                onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={editingDomain.purchaseDate}
                  onChange={(e) => setEditingDomain({ ...editingDomain, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingDomain.purchasePrice}
                  onChange={(e) => setEditingDomain({ ...editingDomain, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registrar
              </label>
              <input
                type="text"
                value={editingDomain.registrar}
                onChange={(e) => setEditingDomain({ ...editingDomain, registrar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  value={editingDomain.registrationDate}
                  onChange={(e) => setEditingDomain({ ...editingDomain, registrationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={editingDomain.expirationDate}
                  onChange={(e) => setEditingDomain({ ...editingDomain, expirationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editingDomain.status}
                onChange={(e) => setEditingDomain({ ...editingDomain, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="parked">Parked</option>
                <option value="expired">Expired</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows="3"
                value={editingDomain.notes}
                onChange={(e) => setEditingDomain({ ...editingDomain, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              Update Domain
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}