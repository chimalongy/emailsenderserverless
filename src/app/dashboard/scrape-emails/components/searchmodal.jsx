'use client'

import { useState, useMemo, useEffect } from 'react'
import { FaSearch, FaSpinner, FaLink, FaList, FaMapMarkerAlt, FaKey } from 'react-icons/fa'
import { MdClose } from 'react-icons/md'
import { useAuth } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabase'

export default function SearchModal({ isOpen, onClose, onNewSearch }) {
  const { user, loading: authLoading } = useAuth()
  const [searchName, setSearchName] = useState('')
  const [searchKeywords, setSearchKeywords] = useState('')
  const [searchLocations, setSearchLocations] = useState('')
  const [urlList, setUrlList] = useState('')
  const [searchMethod, setSearchMethod] = useState('query') // 'query' or 'urls'
  const [isSearching, setIsSearching] = useState(false)
  const [hasApifyKey, setHasApifyKey] = useState(false)
  const [checkingApify, setCheckingApify] = useState(true)

  useEffect(() => {
    const checkApifyKey = async () => {
      if (!user) return
      try {
        setCheckingApify(true)
        const { count, error } = await supabase
          .from('apify_apis')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (error) {
          console.error("Error checking Apify API key:", error)
          setHasApifyKey(false)
        } else {
          setHasApifyKey(count > 0)
        }
      } catch (err) {
        console.error("Error checking Apify API key:", err)
        setHasApifyKey(false)
      } finally {
        setCheckingApify(false)
      }
    }
    
    if (isOpen && user) {
      checkApifyKey()
    }
  }, [user, isOpen])

  useEffect(() => {
    if (!checkingApify && !hasApifyKey) {
      setSearchMethod('urls')
    }
  }, [checkingApify, hasApifyKey])

  // Helper function to extract domain from URL
  const extractDomain = (url) => {
    try {
      // Remove protocol and www prefix
      const domain = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
      // Extract domain (e.g., example.com from https://www.example.com/path)
      const match = domain.match(/^([^\/?#]+)/)
      return match ? match[1] : url
    } catch {
      return url
    }
  }

  // Deduplicate URLs by domain
  const deduplicateUrlsByDomain = (urls) => {
    const seenDomains = new Set()
    const uniqueUrls = []
    const duplicateDomains = []

    urls.forEach(url => {
      const domain = extractDomain(url)
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain)
        uniqueUrls.push(url)
      } else {
        duplicateDomains.push(domain)
      }
    })

    return { uniqueUrls, duplicateDomains, totalDuplicates: urls.length - uniqueUrls.length }
  }

  // Process keywords and locations into arrays
  const keywordsArray = useMemo(() => {
    return searchKeywords.split('\n').map(k => k.trim()).filter(Boolean)
  }, [searchKeywords])

  const locationsArray = useMemo(() => {
    return searchLocations.split('\n').map(l => l.trim()).filter(Boolean)
  }, [searchLocations])

  // Calculate total combinations for display only
  const totalCombinations = useMemo(() => {
    const keywordsCount = keywordsArray.length
    const locationsCount = locationsArray.length
    
    if (keywordsCount === 0 && locationsCount === 0) return 0
    if (keywordsCount === 0) return locationsCount
    if (locationsCount === 0) return keywordsCount
    
    return keywordsCount * locationsCount
  }, [keywordsArray, locationsArray])

  // Process and deduplicate URLs as user types
  const processedUrls = useMemo(() => {
    const urls = urlList.split('\n').map(u => u.trim()).filter(Boolean)
    return deduplicateUrlsByDomain(urls)
  }, [urlList])

  // Handle URL list input with deduplication
  const handleUrlListChange = (value) => {
    setUrlList(value)
  }

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

    if (searchMethod === 'query') {
      if (!hasApifyKey) {
        alert('You must add an Apify API key in settings to perform query searches')
        return
      }
      if (keywordsArray.length === 0 && locationsArray.length === 0) {
        alert('Please enter either keywords, locations, or both')
        return
      }
    }

    if (searchMethod === 'urls' && !urlList.trim()) {
      alert('Please enter at least one URL')
      return
    }

    // Additional validation for URLs
    if (searchMethod === 'urls') {
      const urls = urlList.split('\n').map(u => u.trim()).filter(Boolean)
      const invalidUrls = urls.filter(url => !url.match(/^https?:\/\//))

      if (invalidUrls.length > 0) {
        alert(`Please ensure all URLs start with http:// or https://\nInvalid URLs: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`)
        return
      }
    }

    setIsSearching(true)

    // For query method, store keywords and locations separately
    const keywords = searchMethod === 'query' ? keywordsArray : null
    const locations = searchMethod === 'query' ? locationsArray : null
    const urls = searchMethod === 'urls' ? processedUrls.uniqueUrls : null

    console.log(keywords)
    console.log(locations)

    let scrappingId = null

    try {
      // Step 1: Save to database
      const { data, error: dbError } = await supabase
        .from('scrappings')
        .insert({
          user_id: user.id,
          name: searchName,
          method: searchMethod,
          // Store keywords and locations separately
          keywords,
          locations,
          urls,
          status: 'pending',
          // Store metadata about deduplication for URLs
          metadata: searchMethod === 'urls' ? {
            total_urls_submitted: urlList.split('\n').filter(u => u.trim()).length,
            unique_domains_processed: processedUrls.uniqueUrls.length,
            duplicate_domains_removed: processedUrls.totalDuplicates
          } : null
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

      console.log(data)
      
      // Step 2: Call the API route to start the scrapping process
      let response;
      const endpoint =
        searchMethod === 'query'
          ? '/api/scrappings/start-query-scrapping'
          : '/api/scrappings/start-link-scrapping'

      response = await fetch(endpoint, {
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
            keywords: data.keywords,
            locations: data.locations,
            urls: data.urls,
            name: data.name
          }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)

        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }

        throw new Error(`API failed: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
      }

      let apiResult = {}
      try {
        apiResult = await response.json()
        console.log('Scrapping process started:', apiResult)
      } catch (jsonError) {
        console.warn('Response was OK but not JSON:', jsonError)
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

      alert(`Failed to start scrapping: ${error.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const resetForm = () => {
    setSearchName('')
    setSearchKeywords('')
    setSearchLocations('')
    setUrlList('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl">
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

        {/* Warning banner when Apify keys are missing */}
        {!hasApifyKey && !checkingApify && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-850 shadow-sm">
            <FaKey className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-900 mb-0.5">Apify API Key Required</span>
              You must add at least one Apify API Key to perform search queries.
              {" "}<a href="/dashboard/settings" className="font-semibold text-teal-700 hover:underline">Go to Settings</a> to configure your credentials.
            </div>
          </div>
        )}

        {/* Search Method Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            type="button"
            disabled={!hasApifyKey || checkingApify}
            onClick={() => setSearchMethod('query')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
              !hasApifyKey
                ? 'opacity-50 cursor-not-allowed border-transparent text-gray-400'
                : searchMethod === 'query'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            title={!hasApifyKey ? "Please add an Apify API key in settings to enable query search" : ""}
          >
            <FaSearch className="h-4 w-4" />
            Search by Queries
            {!hasApifyKey && !checkingApify && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                <FaKey className="h-2.5 w-2.5" /> Locked
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSearchMethod('urls')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${searchMethod === 'urls'
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

            {/* Query Search Method - Keywords and Locations as separate fields */}
            {searchMethod === 'query' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Keywords Section */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      <FaKey className="inline-block mr-1 h-3 w-3" />
                      Keywords (One per line)
                    </label>
                    <div className="relative">
                      <textarea
                        value={searchKeywords}
                        onChange={(e) => setSearchKeywords(e.target.value)}
                        placeholder="plumbers
electricians
law firms
restaurants
dentists
real estate agents
web developers"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-40 font-mono text-sm resize-none transition-colors"
                      />
                      <div className="absolute top-3 right-3">
                        <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {keywordsArray.length} keywords
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Services, professions, or business types
                    </p>
                  </div>

                  {/* Locations Section */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      <FaMapMarkerAlt className="inline-block mr-1 h-3 w-3" />
                      Locations (One per line)
                    </label>
                    <div className="relative">
                      <textarea
                        value={searchLocations}
                        onChange={(e) => setSearchLocations(e.target.value)}
                        placeholder="san diego ca
new york ny
austin tx
chicago il
miami fl
los angeles ca
boston ma"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-40 font-mono text-sm resize-none transition-colors"
                      />
                      <div className="absolute top-3 right-3">
                        <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                          {locationsArray.length} locations
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Cities, states, or regions (include state code when possible)
                    </p>
                  </div>
                </div>

                {/* Query Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">
                        Search Configuration
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Keywords and locations will be combined during the search process
                      </p>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      totalCombinations > 20 
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {totalCombinations} potential searches
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Keywords:</span>
                      <div className="mt-1 text-xs">
                        {keywordsArray.length > 0 ? (
                          <span className="text-gray-500">
                            {keywordsArray.slice(0, 3).join(', ')}
                            {keywordsArray.length > 3 && ` +${keywordsArray.length - 3} more`}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No keywords entered</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Locations:</span>
                      <div className="mt-1 text-xs">
                        {locationsArray.length > 0 ? (
                          <span className="text-gray-500">
                            {locationsArray.slice(0, 3).join(', ')}
                            {locationsArray.length > 3 && ` +${locationsArray.length - 3} more`}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No locations entered</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
                    {keywordsArray.length > 0 && locationsArray.length > 0 
                      ? `${keywordsArray.length} keywords × ${locationsArray.length} locations = ${totalCombinations} search combinations`
                      : keywordsArray.length > 0 
                        ? `${keywordsArray.length} keyword searches`
                        : locationsArray.length > 0
                          ? `${locationsArray.length} location-based searches`
                          : 'Enter keywords and/or locations to configure your search'
                    }
                  </div>
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
                      onChange={(e) => handleUrlListChange(e.target.value)}
                      placeholder="https://examplecompany.com
https://www.anotherbusiness.com
https://subdomain.startupwebsite.org
http://localrestaurant.com
https://consultingfirm.net/about"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-40 font-mono text-sm resize-none transition-colors"
                      required
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${processedUrls.totalDuplicates > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                        }`}>
                        {processedUrls.uniqueUrls.length} unique domains
                        {processedUrls.totalDuplicates > 0 && (
                          <span className="ml-1">({processedUrls.totalDuplicates} duplicates removed)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Duplicate domains warning */}
                  {processedUrls.duplicateDomains.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-xs text-amber-800 font-medium">
                        ⚠️ {processedUrls.totalDuplicates} duplicate domain{processedUrls.totalDuplicates > 1 ? 's' : ''} removed:
                      </p>
                      <p className="text-xs text-amber-700 truncate">
                        {processedUrls.duplicateDomains.slice(0, 3).join(', ')}
                        {processedUrls.duplicateDomains.length > 3 && `... (${processedUrls.duplicateDomains.length - 3} more)`}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Each line must be a complete URL starting with https:// or http://.
                    <br />
                    Duplicate domains will be automatically removed (e.g., https://example.com and https://www.example.com are considered the same domain).
                  </p>
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
                  (searchMethod === 'query' && keywordsArray.length === 0 && locationsArray.length === 0) ||
                  (searchMethod === 'urls' && processedUrls.uniqueUrls.length === 0)}
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
                        Start Search
                      </>
                    ) : (
                      <>
                        <FaLink />
                        Process {processedUrls.uniqueUrls.length} Unique Domain{processedUrls.uniqueUrls.length !== 1 ? 's' : ''}
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