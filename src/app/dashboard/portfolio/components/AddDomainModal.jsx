'use client'

import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'

export default function AddDomainModal({ isOpen, onClose, onAddDomain }) {
  const [newDomain, setNewDomain] = useState({
    name: '',
    purchasePrice: '',
    notes: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!newDomain.name.trim()) {
      alert('Please enter a domain name')
      return
    }

    const domainToAdd = {
      name: newDomain.name.toLowerCase().trim(),
      purchasePrice: parseFloat(newDomain.purchasePrice) || 0,
      notes: newDomain.notes || ''
    }

    onAddDomain(domainToAdd)
    
    // Reset form
    setNewDomain({
      name: '',
      purchasePrice: '',
      notes: ''
    })
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60  flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Add New Domain</h3>
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
                placeholder="example.com"
                value={newDomain.name}
                onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })}
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
                placeholder="0.00"
                value={newDomain.purchasePrice}
                onChange={(e) => setNewDomain({ ...newDomain, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows="3"
                placeholder="Additional notes about this domain..."
                value={newDomain.notes}
                onChange={(e) => setNewDomain({ ...newDomain, notes: e.target.value })}
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
              Add Domain
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}