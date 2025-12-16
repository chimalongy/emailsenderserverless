'use client'

import { useState } from 'react'
import { FaSearch, FaSpinner } from 'react-icons/fa'

export default function SearchModal({ isOpen, onClose, onNewSearch }) {
  const [searchName, setSearchName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!searchName.trim() || !searchQuery.trim()) return
    
    setIsSearching(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create new search object
    const newSearch = {
      id: Date.now().toString(),
      name: searchName,
      query: searchQuery,
      emailCount: Math.floor(Math.random() * 500) + 50,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      status: 'processing'
    }
    
    onNewSearch(newSearch)
    setIsSearching(false)
    setSearchName('')
    setSearchQuery('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">New Email Search</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Give this search a descriptive name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What businesses or professionals are you looking for? (e.g., 'plumbers in san diego', 'tech startups austin')"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-32"
                required
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Search Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Be specific for better results (e.g., "plumbers in san diego")</li>
                <li>• Include location for local businesses</li>
                <li>• Use industry terms for specific sectors</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSearching || !searchName.trim() || !searchQuery.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSearching ? (
                  <>
                    <FaSpinner className="mr-2 animate-spin" />
                    Creating Search...
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-2" />
                    Start Search
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}