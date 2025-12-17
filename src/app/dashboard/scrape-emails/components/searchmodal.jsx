'use client'

import { useState } from 'react'
import { FaSearch, FaSpinner, FaLink, FaList } from 'react-icons/fa'
import { MdClose } from 'react-icons/md'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'

export default function SearchModal({ isOpen, onClose, onNewSearch }) {
     const { user, loading: authLoading } = useAuth()
  const [searchName, setSearchName] = useState('')
  const [searchQueries, setSearchQueries] = useState('')
  const [urlList, setUrlList] = useState('')
  const [searchMethod, setSearchMethod] = useState('query') // 'query' or 'urls'
  const [isSearching, setIsSearching] = useState(false)


const handleSubmit = async (e) => {
  e.preventDefault()
  if (!user) {
    console.error('User not authenticated')
    return
  }

  // Validation
  if (!searchName.trim()) {
    alert('Please enter a search name')
    return
  }
  
  if (searchMethod === 'query' && !searchQueries.trim()) {
    alert('Please enter at least one search query')
    return
  }
  
  if (searchMethod === 'urls' && !urlList.trim()) {
    alert('Please enter at least one URL')
    return
  }

  setIsSearching(true)

  const queries =
    searchMethod === 'query'
      ? searchQueries.split('\n').map(q => q.trim()).filter(Boolean)
      : null

  const urls =
    searchMethod === 'urls'
      ? urlList.split('\n').map(u => u.trim()).filter(Boolean)
      : null

  let scrappingId = null

  try {
    // Step 1: Save to database
    const { data, error: dbError } = await supabase
      .from('scrappings')
      .insert({
        user_id: user.id,
        name: searchName,
        method: searchMethod,
        queries,
        urls,
        status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    scrappingId = data.id
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Your session has expired. Please sign in again.')
    }

    // Step 2: Call the API route to start the scrapping process
    const response = await fetch('/api/scrappings/start-scrapping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        scrapping: {
          id: data.id,
          user_id: data.user_id,
          method: data.method,
          queries: data.queries,
          urls: data.urls,
          name: data.name
        }
      }),
    })

    // First check if the response is OK
    if (!response.ok) {
      // Try to get error text (might be HTML or JSON)
      const errorText = await response.text()
      console.error('API Error Response:', errorText)
      
      // Try to parse as JSON if it looks like JSON
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // If not JSON, it's probably HTML
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      throw new Error(`API failed: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
    }

    // If response is OK, try to parse as JSON
    let apiResult = {}
    try {
      apiResult = await response.json()
      console.log('Scrapping process started:', apiResult)
    } catch (jsonError) {
      console.warn('Response was OK but not JSON:', jsonError)
      // This is fine, the API might return success without body
      apiResult = { success: true }
    }

    // Step 3: Update status to processing
    const { error: updateError } = await supabase
      .from('scrappings')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', data.id)

    if (updateError) {
      console.error('Failed to update status:', updateError)
    }

    // Step 4: Notify parent component
    if (onNewSearch) {
      const updatedData = {
        ...data,
        status: 'processing',
        started_at: new Date().toISOString()
      }
      onNewSearch(updatedData)
    }

    resetForm()
    onClose()

  } catch (error) {
    console.error('Scrapping creation failed:', error)
    
    // Update the scrapping status to failed if we have an ID
    if (scrappingId) {
      try {
        await supabase
          .from('scrappings')
          .update({ 
            status: 'failed',
            error: error.message || 'Unknown error'
          })
          .eq('id', scrappingId)
      } catch (updateError) {
        console.error('Failed to update failed status:', updateError)
      }
    }
    
    // Show error to user
    alert(`Failed to start scrapping: ${error.message}`)
  } finally {
    setIsSearching(false)
  }
}

  const resetForm = () => {
    setSearchName('')
    setSearchQueries('')
    setUrlList('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">New Email Search</h3>
            <p className="text-sm text-gray-500 mt-1">Choose your search method</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Search Method Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setSearchMethod('query')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
              searchMethod === 'query'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaSearch className="h-4 w-4" />
            Search by Queries
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod('urls')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
              searchMethod === 'urls'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaLink className="h-4 w-4" />
            Add URL List
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Search Name - Common for both methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name *
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Give this search a descriptive name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                required
              />
            </div>

            {/* Query Search Method */}
            {searchMethod === 'query' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Queries (One per line) *
                  </label>
                  <div className="relative">
                    <textarea
                      value={searchQueries}
                      onChange={(e) => setSearchQueries(e.target.value)}
                      placeholder="plumbers in san diego
tech startups austin
digital marketing agencies new york
restaurant owners chicago
law firms boston"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-40 font-mono text-sm resize-none transition-colors"
                      required
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <div className="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded-full">
                        {searchQueries.split('\n').filter(query => query.trim()).length} queries
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Each line will be processed as a separate search query
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <FaSearch className="h-4 w-4" />
                    Query Format Tips
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">1</span>
                      <span><strong>One query per line</strong> - Each line is processed separately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">2</span>
                      <span><strong>Include location</strong> - "plumbers in san diego"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">3</span>
                      <span><strong>Be specific</strong> - "b2b saas companies remote"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">4</span>
                      <span><strong>Use keywords</strong> - "founder ceo startup"</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* URL List Method */}
            {searchMethod === 'urls' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URLs (One per line) *
                  </label>
                  <div className="relative">
                    <textarea
                      value={urlList}
                      onChange={(e) => setUrlList(e.target.value)}
                      placeholder="https://examplecompany.com
https://anotherbusiness.com
https://startupwebsite.org
https://localrestaurant.com
https://consultingfirm.net"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-40 font-mono text-sm resize-none transition-colors"
                      required
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                        {urlList.split('\n').filter(url => url.trim()).length} URLs
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Each line must be a complete URL starting with https:// or http://
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100">
                  <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <FaLink className="h-4 w-4" />
                    URL Format Tips
                  </h4>
                  <ul className="text-sm text-purple-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">✓</span>
                      <span><strong>One URL per line</strong> - Include protocol (https://)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">✓</span>
                      <span><strong>Valid format</strong> - https://example.com or http://site.org</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">✓</span>
                      <span><strong>Publicly accessible</strong> - Ensure sites aren't behind login</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-800 rounded-full h-5 w-5 flex items-center justify-center text-xs mt-0.5">✓</span>
                      <span><strong>Business websites</strong> - We'll crawl for contact emails</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSearching}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSearching || !searchName.trim() || 
                  (searchMethod === 'query' && !searchQueries.trim()) ||
                  (searchMethod === 'urls' && !urlList.trim())}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {isSearching ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Creating Search...
                  </>
                ) : (
                  <>
                    {searchMethod === 'query' ? (
                      <>
                        <FaSearch />
                        Start {searchQueries.split('\n').filter(q => q.trim()).length} Query Search
                      </>
                    ) : (
                      <>
                        <FaLink />
                        Process {urlList.split('\n').filter(u => u.trim()).length} URLs
                      </>
                    )}
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