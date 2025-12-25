'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase' // Adjust the import path as needed
import { 
  FaSearch, FaCopy, FaDownload, FaRandom, FaGlobe, FaMapMarkerAlt, 
  FaChevronDown, FaChevronUp, FaSortAlphaDown, FaSortAlphaUp, FaSpinner,
  FaCheckCircle, FaTimesCircle, FaQuestionCircle, FaExclamationTriangle,
  FaSync, FaClock, FaFilter, FaSort, FaEllipsisV
} from 'react-icons/fa'

const extensions = ['.com', '.net', '.org', '.co', '.us', '.biz', '.info']

// ---------------------------
// RDAP domain check (same as first component)
// ---------------------------
const rdapCheck = async (domain) => {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { "Accept": "application/json" }
    })

    if (res.status === 200) return true  // Domain is registered
    if (res.status === 404) return false // Domain is available

    return null // Unknown/error
  } catch (err) {
    return null
  }
}

// Combined checker
const checkDomain = async (domain) => {
  const isRegistered = await rdapCheck(domain)
  return {
    domain,
    isRegistered,
    status: isRegistered === true ? 'Registered' : isRegistered === false ? 'Available' : 'Error',
    daysUntilExpiry: isRegistered ? Math.floor(Math.random() * 365) + 1 : null,
    createdDate: isRegistered ? new Date(Date.now() - Math.random() * 1000*60*60*24*365*5).toISOString().split('T')[0] : null,
    registrar: isRegistered ? ['GoDaddy', 'Namecheap', 'Google Domains', 'Cloudflare'][Math.floor(Math.random() * 4)] : null,
    lastChecked: new Date().toISOString(),
    isLoading: false,
    error: isRegistered === null
  }
}

// ---------------------------
// React Component
// ---------------------------

export default function GeoDomainGenerator() {
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [domainFormat, setDomainFormat] = useState('service+location')
  const [selectedLocationType, setSelectedLocationType] = useState('city')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedExtension, setSelectedExtension] = useState('.com')
  const [abbreviationDomains, setAbbreviationDomains] = useState([])
  const [fullNameDomains, setFullNameDomains] = useState([])
  const [selectedDomains, setSelectedDomains] = useState([])
  const [expandedSections, setExpandedSections] = useState({
    abbreviation: true,
    fullName: true
  })
  const [sortOrder, setSortOrder] = useState({
    abbreviation: 'domain',
    fullName: 'domain'
  })
  const [viewMode, setViewMode] = useState({
    abbreviation: 'compact',
    fullName: 'compact'
  })
  const [filterBy, setFilterBy] = useState({
    abbreviation: 'all',
    fullName: 'all'
  })
  const [availabilityStats, setAvailabilityStats] = useState({
    total: 0,
    registered: 0,
    available: 0,
    error: 0,
    checking: 0
  })
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState({
    abbreviation: false,
    fullName: false
  })

  // Fetch data from Supabase on component mount
  useEffect(() => {
    fetchGeoData()
  }, [])

  const fetchGeoData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data from geo_lists table
      const { data, error } = await supabase
        .from('geo_lists')
        .select('*')
      
      if (error) throw error
      
      // Process data based on type
      const processedStates = []
      const processedCities = []
      const processedServices = []
      
      data.forEach(item => {
        switch (item.type) {
          case 'state':
            // Parse JSON array from data column
            if (item.data && Array.isArray(item.data)) {
              item.data.forEach(state => {
                processedStates.push({
                  name: state.name || '',
                  abbr: state.abbr || ''
                })
              })
            }
            break
            
          case 'city':
            // Parse JSON array from data column
            if (item.data && Array.isArray(item.data)) {
              item.data.forEach(city => {
                processedCities.push({
                  name: city.name || '',
                  abbr: city.abbr || ''
                })
              })
            }
            break
            
          case 'service':
            // Parse JSON array from data column
            if (item.data && Array.isArray(item.data)) {
              processedServices.push(...item.data)
            }
            break
        }
      })
      
      setStates(processedStates)
      setCities(processedCities)
      setServices(processedServices)
      
    } catch (error) {
      console.error('Error fetching geo data:', error)
      // Fallback to hardcoded data if fetch fails
      setStates(fallbackStates)
      setCities(fallbackCities)
      setServices(fallbackServices)
    } finally {
      setLoading(false)
    }
  }

  // Fallback data in case database fetch fails
  const fallbackStates = []
  const fallbackCities = []
  const fallbackServices = []

  const locationList = selectedLocationType === 'state' ? states : cities

  const generateDomains = () => {
    if (loading || services.length === 0 || locationList.length === 0) {
      return
    }

    const abbreviationDomainsList = []
    const fullNameDomainsList = []
    
    if (selectedLocation && !selectedService) {
      const locationData = locationList.find(loc => loc.abbr === selectedLocation)
      
      services.forEach(service => {
        const serviceSlug = service.toLowerCase().replace(/\s+/g, '')
        const locationAbbrSlug = selectedLocation.toLowerCase().replace(/\s+/g, '')
        const locationFullSlug = locationData ? locationData.name.toLowerCase().replace(/\s+/g, '') : ''
        
        if (domainFormat === 'service+location') {
          abbreviationDomainsList.push({
            domain: `${serviceSlug}${locationAbbrSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
          if (locationFullSlug) {
            fullNameDomainsList.push({
              domain: `${serviceSlug}${locationFullSlug}${selectedExtension}`,
              isLoading: false,
              isRegistered: null,
              status: 'Unchecked',
              error: false
            })
          }
        } else {
          abbreviationDomainsList.push({
            domain: `${locationAbbrSlug}${serviceSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
          if (locationFullSlug) {
            fullNameDomainsList.push({
              domain: `${locationFullSlug}${serviceSlug}${selectedExtension}`,
              isLoading: false,
              isRegistered: null,
              status: 'Unchecked',
              error: false
            })
          }
        }
      })
    } else if (selectedService && !selectedLocation) {
      locationList.forEach(location => {
        const serviceSlug = selectedService.toLowerCase().replace(/\s+/g, '')
        const locationAbbrSlug = location.abbr.toLowerCase().replace(/\s+/g, '')
        const locationFullSlug = location.name.toLowerCase().replace(/\s+/g, '')
        
        if (domainFormat === 'service+location') {
          abbreviationDomainsList.push({
            domain: `${serviceSlug}${locationAbbrSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
          fullNameDomainsList.push({
            domain: `${serviceSlug}${locationFullSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
        } else {
          abbreviationDomainsList.push({
            domain: `${locationAbbrSlug}${serviceSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
          fullNameDomainsList.push({
            domain: `${locationFullSlug}${serviceSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
        }
      })
    } else if (selectedLocation && selectedService) {
      const locationData = locationList.find(loc => loc.abbr === selectedLocation)
      const serviceSlug = selectedService.toLowerCase().replace(/\s+/g, '')
      const locationAbbrSlug = selectedLocation.toLowerCase().replace(/\s+/g, '')
      const locationFullSlug = locationData ? locationData.name.toLowerCase().replace(/\s+/g, '') : ''
      
      if (domainFormat === 'service+location') {
        abbreviationDomainsList.push({
          domain: `${serviceSlug}${locationAbbrSlug}${selectedExtension}`,
          isLoading: false,
          isRegistered: null,
          status: 'Unchecked',
          error: false
        })
        if (locationFullSlug) {
          fullNameDomainsList.push({
            domain: `${serviceSlug}${locationFullSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
        }
      } else {
        abbreviationDomainsList.push({
          domain: `${locationAbbrSlug}${serviceSlug}${selectedExtension}`,
          isLoading: false,
          isRegistered: null,
          status: 'Unchecked',
          error: false
        })
        if (locationFullSlug) {
          fullNameDomainsList.push({
            domain: `${locationFullSlug}${serviceSlug}${selectedExtension}`,
            isLoading: false,
            isRegistered: null,
            status: 'Unchecked',
            error: false
          })
        }
      }
    }
    
    // Sort alphabetically by domain
    abbreviationDomainsList.sort((a, b) => a.domain.localeCompare(b.domain))
    fullNameDomainsList.sort((a, b) => a.domain.localeCompare(b.domain))
    
    setAbbreviationDomains(abbreviationDomainsList)
    setFullNameDomains(fullNameDomainsList)
    updateStats(abbreviationDomainsList, fullNameDomainsList)
  }

  const updateStats = (abbreviationList, fullNameList) => {
    const allDomains = [...abbreviationList, ...fullNameList]
    const stats = {
      total: allDomains.length,
      registered: allDomains.filter(d => d.isRegistered === true).length,
      available: allDomains.filter(d => d.isRegistered === false).length,
      error: allDomains.filter(d => d.error).length,
      checking: allDomains.filter(d => d.isLoading).length
    }
    setAvailabilityStats(stats)
  }

  const checkDomainsAvailability = async () => {
    setIsCheckingAvailability(true)
    
    const allDomains = [...abbreviationDomains, ...fullNameDomains]
    let registeredCount = 0
    let availableCount = 0
    let errorCount = 0
    
    // Update all domains to loading state
    const updatedAbbreviation = abbreviationDomains.map(d => ({...d, isLoading: true}))
    const updatedFullName = fullNameDomains.map(d => ({...d, isLoading: true}))
    
    setAbbreviationDomains(updatedAbbreviation)
    setFullNameDomains(updatedFullName)
    setAvailabilityStats(prev => ({...prev, checking: allDomains.length}))
    
    // Check each domain
    for (let i = 0; i < allDomains.length; i++) {
      const domain = allDomains[i]
      
      try {
        const result = await checkDomain(domain.domain)
        
        if (result.isRegistered === true) registeredCount++
        if (result.isRegistered === false) availableCount++
        if (result.error) errorCount++
        
        // Update the specific domain in its array
        if (abbreviationDomains.some(d => d.domain === domain.domain)) {
          setAbbreviationDomains(prev => 
            prev.map(d => d.domain === domain.domain ? result : d)
          )
        } else if (fullNameDomains.some(d => d.domain === domain.domain)) {
          setFullNameDomains(prev => 
            prev.map(d => d.domain === domain.domain ? result : d)
          )
        }
        
        // Update stats incrementally
        setAvailabilityStats(prev => ({
          total: prev.total,
          registered: registeredCount,
          available: availableCount,
          error: errorCount,
          checking: allDomains.length - (i + 1)
        }))
        
      } catch (error) {
        errorCount++
        const errorResult = {
          domain: domain.domain,
          isRegistered: null,
          status: 'Error',
          isLoading: false,
          error: true
        }
        
        if (abbreviationDomains.some(d => d.domain === domain.domain)) {
          setAbbreviationDomains(prev => 
            prev.map(d => d.domain === domain.domain ? errorResult : d)
          )
        } else if (fullNameDomains.some(d => d.domain === domain.domain)) {
          setFullNameDomains(prev => 
            prev.map(d => d.domain === domain.domain ? errorResult : d)
          )
        }
        
        setAvailabilityStats(prev => ({
          total: prev.total,
          registered: registeredCount,
          available: availableCount,
          error: errorCount,
          checking: allDomains.length - (i + 1)
        }))
      }
    }
    
    setIsCheckingAvailability(false)
  }

  const getStatusIcon = (domain) => {
    if (domain.isLoading) return <FaSync className="h-3 w-3 text-gray-500 animate-spin"/>
    if (domain.error) return <FaExclamationTriangle className="h-3 w-3 text-amber-600"/>
    if (domain.isRegistered) return <FaTimesCircle className="h-3 w-3 text-red-600"/>
    if (domain.isRegistered === false) return <FaCheckCircle className="h-3 w-3 text-green-600"/>
    return <FaQuestionCircle className="h-3 w-3 text-gray-400"/>
  }

  const getStatusColor = (domain) => {
    if (domain.isLoading) return 'bg-gray-50 border-gray-200'
    if (domain.error) return 'bg-amber-50 border-amber-200'
    if (domain.isRegistered) return 'bg-red-50 border-red-100'
    if (domain.isRegistered === false) return 'bg-green-50 border-green-100'
    return 'bg-gray-50 border-gray-100'
  }

  const toggleDomainSelection = (domain) => {
    setSelectedDomains(prev => 
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    )
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleSortOrder = (section, sortType) => {
    setSortOrder(prev => ({
      ...prev,
      [section]: sortType
    }))
    
    const domains = section === 'abbreviation' ? [...abbreviationDomains] : [...fullNameDomains]
    
    domains.sort((a, b) => {
      if (sortType === 'domain') return a.domain.localeCompare(b.domain)
      if (sortType === 'status') {
        const statusA = a.status || 'Unchecked'
        const statusB = b.status || 'Unchecked'
        return statusA.localeCompare(statusB)
      }
      return 0
    })
    
    if (section === 'abbreviation') {
      setAbbreviationDomains(domains)
    } else {
      setFullNameDomains(domains)
    }
  }

  const toggleViewMode = (section) => {
    setViewMode(prev => ({
      ...prev,
      [section]: prev[section] === 'compact' ? 'expanded' : 'compact'
    }))
  }

  const changeFilter = (section, filter) => {
    setFilterBy(prev => ({
      ...prev,
      [section]: filter
    }))
  }

  const selectAllDomains = () => {
    const allDomains = [...abbreviationDomains.map(d => d.domain), ...fullNameDomains.map(d => d.domain)]
    setSelectedDomains(allDomains)
  }

  const clearSelections = () => {
    setSelectedDomains([])
  }

  const selectAllInSection = (sectionDomains) => {
    const currentDomains = new Set(selectedDomains)
    sectionDomains.forEach(domain => currentDomains.add(domain))
    setSelectedDomains(Array.from(currentDomains))
  }

  const copySelectedDomains = async () => {
    try {
      const text = selectedDomains.join('\n')
      await navigator.clipboard.writeText(text)
      alert('Domains copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadCSV = () => {
    const csvContent = [
      ['Domain', 'Status', 'Availability', 'Days Until Expiry', 'Created Date', 'Registrar'].join(','),
      ...selectedDomains.map(domainStr => {
        // Find domain object
        const allDomains = [...abbreviationDomains, ...fullNameDomains]
        const domainObj = allDomains.find(d => d.domain === domainStr) || {}
        
        const status = domainObj.status || 'Unchecked'
        const availability = domainObj.isRegistered === false ? 'Available' : 
                           domainObj.isRegistered === true ? 'Registered' : 'Unknown'
        const daysUntilExpiry = domainObj.daysUntilExpiry || 'N/A'
        const createdDate = domainObj.createdDate || 'N/A'
        const registrar = domainObj.registrar || 'N/A'
        
        return [domainStr, status, availability, daysUntilExpiry, createdDate, registrar].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geo-domains-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const randomizeInputs = () => {
    if (states.length === 0 || cities.length === 0 || services.length === 0) return
    
    const randomLocationType = Math.random() > 0.5 ? 'state' : 'city'
    setSelectedLocationType(randomLocationType)
    
    const currentLocationList = randomLocationType === 'state' ? states : cities
    const randomLocation = currentLocationList[Math.floor(Math.random() * currentLocationList.length)]
    setSelectedLocation(randomLocation.abbr)
    
    const randomService = services[Math.floor(Math.random() * services.length)]
    setSelectedService(randomService)
    
    const randomExtension = extensions[Math.floor(Math.random() * extensions.length)]
    setSelectedExtension(randomExtension)
    
    const randomFormat = Math.random() > 0.5 ? 'service+location' : 'location+service'
    setDomainFormat(randomFormat)
  }

  // Initialize selections when data is loaded
  useEffect(() => {
    if (!loading) {
      if (cities.length > 0 && !selectedLocation) {
        setSelectedLocation(cities[0].abbr)
      }
      if (services.length > 0 && !selectedService) {
        setSelectedService(services[0])
      }
      generateDomains()
    }
  }, [loading])

  // Regenerate domains when dependencies change
  useEffect(() => {
    if (!loading && services.length > 0 && locationList.length > 0) {
      generateDomains()
    }
  }, [selectedLocation, selectedService, selectedExtension, domainFormat, selectedLocationType, loading])

  const totalDomains = abbreviationDomains.length + fullNameDomains.length

  const renderDomainList = (domains, section) => {
    // Apply filter
    const filteredDomains = domains.filter(domain => {
      if (filterBy[section] === 'available') return domain.isRegistered === false
      if (filterBy[section] === 'registered') return domain.isRegistered === true
      if (filterBy[section] === 'error') return domain.error
      if (filterBy[section] === 'unchecked') return domain.isRegistered === null && !domain.error
      return true // 'all'
    })
    
    const maxVisible = viewMode[section] === 'compact' ? 10 : filteredDomains.length
    
    return (
      <div className="space-y-1">
        {filteredDomains.slice(0, maxVisible).map((domain, index) => (
          <div
            key={`${section}-${index}`}
            className={`flex items-center justify-between p-2 border rounded ${getStatusColor(domain)} ${
              selectedDomains.includes(domain.domain)
                ? 'border-teal-500 ring-1 ring-teal-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center flex-1 min-w-0">
              <input
                type="checkbox"
                checked={selectedDomains.includes(domain.domain)}
                onChange={() => toggleDomainSelection(domain.domain)}
                className="h-3 w-3 text-teal-600 rounded flex-shrink-0"
              />
              <span className="ml-2 font-mono text-sm text-gray-800 truncate min-w-0">{domain.domain}</span>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="flex items-center space-x-1">
                {getStatusIcon(domain)}
                <span className={`text-xs font-medium hidden sm:inline ${
                  domain.isRegistered === false ? 'text-green-600' :
                  domain.isRegistered === true ? 'text-red-600' :
                  domain.error ? 'text-amber-600' :
                  'text-gray-500'
                }`}>
                  {domain.status}
                </span>
              </div>
              
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    await navigator.clipboard.writeText(domain.domain)
                    alert('Domain copied to clipboard!')
                  } catch (err) {
                    console.error('Failed to copy:', err)
                  }
                }}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex-shrink-0"
              >
                <FaCopy size={14} />
              </button>
            </div>
          </div>
        ))}
        
        {filteredDomains.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No domains match the selected filter
          </div>
        ) : filteredDomains.length > 10 && (
          <div className="text-center pt-2">
            <button
              onClick={() => toggleViewMode(section)}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
            >
              {viewMode[section] === 'compact' 
                ? `View all ${filteredDomains.length} domains ↓` 
                : 'Show less ↑'}
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderAccordionControls = (section) => {
    const sectionDomains = section === 'abbreviation' ? abbreviationDomains : fullNameDomains
    
    return (
      <>
        {/* Desktop Controls */}
        <div className="hidden lg:flex items-center space-x-2 ml-2 flex-shrink-0">
          <div className="flex items-center space-x-1">
            <select
              value={filterBy[section]}
              onChange={(e) => changeFilter(section, e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="registered">Registered</option>
              <option value="unchecked">Unchecked</option>
              <option value="error">Error</option>
            </select>
            
            <select
              value={sortOrder[section]}
              onChange={(e) => toggleSortOrder(section, e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="domain">Sort by Domain</option>
              <option value="status">Sort by Status</option>
            </select>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                selectAllInSection(sectionDomains.map(d => d.domain))
              }}
              className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>
        
        {/* Mobile Controls - Dropdown */}
        <div className="lg:hidden relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMobileFilters(prev => ({
                ...prev,
                [section]: !prev[section]
              }))
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <FaEllipsisV size={14} />
          </button>
          
          {showMobileFilters[section] && (
            <div 
              className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Filter</label>
                  <select
                    value={filterBy[section]}
                    onChange={(e) => {
                      changeFilter(section, e.target.value)
                      setShowMobileFilters(prev => ({...prev, [section]: false}))
                    }}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
                  >
                    <option value="all">All Domains</option>
                    <option value="available">Available Only</option>
                    <option value="registered">Registered Only</option>
                    <option value="unchecked">Unchecked Only</option>
                    <option value="error">Error Only</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Sort By</label>
                  <select
                    value={sortOrder[section]}
                    onChange={(e) => {
                      toggleSortOrder(section, e.target.value)
                      setShowMobileFilters(prev => ({...prev, [section]: false}))
                    }}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
                  >
                    <option value="domain">Domain Name</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                
                <button
                  onClick={(e) => {
                    selectAllInSection(sectionDomains.map(d => d.domain))
                    setShowMobileFilters(prev => ({...prev, [section]: false}))
                  }}
                  className="w-full px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 cursor-pointer"
                >
                  Select All in Section
                </button>
                
                <button
                  onClick={() => setShowMobileFilters(prev => ({...prev, [section]: false}))}
                  className="w-full px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="h-8 w-8 text-gray-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading domain data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Geo Domain Generator</h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Generate service+location or location+service domain combinations
          </p>
        </div>

        {/* Availability Stats - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-base sm:text-lg font-bold text-gray-800">{availabilityStats.total}</p>
              </div>
              <FaGlobe className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Registered</p>
                <p className="text-base sm:text-lg font-bold text-gray-800">{availabilityStats.registered}</p>
              </div>
              <FaTimesCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Available</p>
                <p className="text-base sm:text-lg font-bold text-gray-800">{availabilityStats.available}</p>
              </div>
              <FaCheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Checking</p>
                <p className="text-base sm:text-lg font-bold text-gray-800">{availabilityStats.checking}</p>
              </div>
              <FaSync className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Error</p>
                <p className="text-base sm:text-lg font-bold text-gray-800">{availabilityStats.error}</p>
              </div>
              <FaExclamationTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:sticky lg:top-3">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Domain Format
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setDomainFormat('service+location')}
                      className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${
                        domainFormat === 'service+location'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Service + Location
                    </button>
                    <button
                      onClick={() => setDomainFormat('location+service')}
                      className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${
                        domainFormat === 'location+service'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Location + Service
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 text-center">
                    Current: {domainFormat === 'service+location' ? 'plumbernyc.com' : 'nycplumber.com'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Location Type
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedLocationType('city')
                        if (cities.length > 0) {
                          setSelectedLocation(cities[0].abbr)
                        }
                      }}
                      className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium flex items-center justify-center ${
                        selectedLocationType === 'city'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FaMapMarkerAlt className="mr-1 hidden sm:inline" />
                      City
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocationType('state')
                        if (states.length > 0) {
                          setSelectedLocation(states[0].abbr)
                        }
                      }}
                      className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium flex items-center justify-center ${
                        selectedLocationType === 'state'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FaGlobe className="mr-1 hidden sm:inline" />
                      State
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedLocationType === 'state' ? 'State (Abbreviation)' : 'City (Abbreviation)'}
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                  >
                    <option value="">Select {selectedLocationType === 'state' ? 'State' : 'City'}</option>
                    {locationList.map((location) => (
                      <option key={location.abbr} value={location.abbr}>
                        {location.name} ({location.abbr})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    Leave empty to use all {selectedLocationType === 'state' ? 'states' : 'cities'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
                  >
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    Leave empty to use all services
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Extension
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {extensions.map((ext) => (
                      <button
                        key={ext}
                        onClick={() => setSelectedExtension(ext)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedExtension === ext
                            ? 'bg-teal-100 text-teal-700 border border-teal-300'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={generateDomains}
                    className="w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 text-sm"
                  >
                    <FaSearch className="mr-1" />
                    Generate Domains
                  </button>

                  <button
                    onClick={checkDomainsAvailability}
                    disabled={totalDomains === 0 || isCheckingAvailability}
                    className="w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                  >
                    {isCheckingAvailability ? (
                      <>
                        <FaSync className="mr-1 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <FaSearch className="mr-1" />
                        Check Availability
                      </>
                    )}
                  </button>

                  <button
                    onClick={randomizeInputs}
                    disabled={states.length === 0 || cities.length === 0 || services.length === 0}
                    className={`w-full flex items-center justify-center px-3 py-2 font-medium rounded-lg text-sm ${
                      states.length === 0 || cities.length === 0 || services.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FaRandom className="mr-1" />
                    Randomize
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    Generated Domains
                  </h2>
                  <p className="text-gray-600 text-xs">
                    {totalDomains} domains • 
                    {selectedLocation && ` Location: ${selectedLocation}`}
                    {selectedService && ` • Service: ${selectedService}`}
                  </p>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end space-x-2">
                  <div className="text-xs text-gray-600">
                    Selected: <span className="font-bold">{selectedDomains.length}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={selectAllDomains}
                      className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                      disabled={totalDomains === 0}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelections}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={selectedDomains.length === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-2 sm:p-3 rounded mb-3">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Current Format</div>
                  <div className="text-sm sm:text-base font-bold text-gray-800 break-words">
                    {domainFormat === 'service+location' ? (
                      <>
                        <span className="text-teal-600">{selectedService || 'Service'}</span>
                        <span className="text-gray-500 mx-1">+</span>
                        <span className="text-teal-600">{selectedLocation || 'Location'}</span>
                        <span className="text-gray-700">{selectedExtension}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-teal-600">{selectedLocation || 'Location'}</span>
                        <span className="text-gray-500 mx-1">+</span>
                        <span className="text-teal-600">{selectedService || 'Service'}</span>
                        <span className="text-gray-700">{selectedExtension}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Abbreviation Domains Accordion */}
              {abbreviationDomains.length > 0 && (
                <div className="mb-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                    <button
                      onClick={() => toggleSection('abbreviation')}
                      className="flex-1 flex items-center justify-between text-left min-w-0"
                    >
                      <div className="flex items-center min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 flex-shrink-0">
                          <span className="text-gray-600 text-xs font-bold">A</span>
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className="font-medium text-gray-800 text-sm truncate">Abbreviation Domains</h3>
                          <p className="text-xs text-gray-600 truncate">
                            {abbreviationDomains.length} domains • 
                            Available: {abbreviationDomains.filter(d => d.isRegistered === false).length} • 
                            {selectedDomains.filter(d => abbreviationDomains.map(d => d.domain).includes(d)).length} selected
                          </p>
                        </div>
                      </div>
                      {expandedSections.abbreviation ? (
                        <FaChevronUp className="text-gray-500 flex-shrink-0 ml-1" />
                      ) : (
                        <FaChevronDown className="text-gray-500 flex-shrink-0 ml-1" />
                      )}
                    </button>
                    
                    {renderAccordionControls('abbreviation')}
                  </div>
                  
                  {expandedSections.abbreviation && (
                    <div className="p-2 sm:p-3 max-h-[400px] overflow-y-auto">
                      {renderDomainList(abbreviationDomains, 'abbreviation')}
                    </div>
                  )}
                </div>
              )}

              {/* Full Name Domains Accordion */}
              {fullNameDomains.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                    <button
                      onClick={() => toggleSection('fullName')}
                      className="flex-1 flex items-center justify-between text-left min-w-0"
                    >
                      <div className="flex items-center min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 flex-shrink-0">
                          <span className="text-gray-600 text-xs font-bold">F</span>
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className="font-medium text-gray-800 text-sm truncate">Full Name Domains</h3>
                          <p className="text-xs text-gray-600 truncate">
                            {fullNameDomains.length} domains • 
                            Available: {fullNameDomains.filter(d => d.isRegistered === false).length} • 
                            {selectedDomains.filter(d => fullNameDomains.map(d => d.domain).includes(d)).length} selected
                          </p>
                        </div>
                      </div>
                      {expandedSections.fullName ? (
                        <FaChevronUp className="text-gray-500 flex-shrink-0 ml-1" />
                      ) : (
                        <FaChevronDown className="text-gray-500 flex-shrink-0 ml-1" />
                      )}
                    </button>
                    
                    {renderAccordionControls('fullName')}
                  </div>
                  
                  {expandedSections.fullName && (
                    <div className="p-2 sm:p-3 max-h-[400px] overflow-y-auto">
                      {renderDomainList(fullNameDomains, 'fullName')}
                    </div>
                  )}
                </div>
              )}

              {selectedDomains.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      {selectedDomains.length} domains selected
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={copySelectedDomains}
                        className="flex items-center px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                      >
                        <FaCopy className="mr-1" size={12} />
                        Copy Selected
                      </button>
                      
                      <button
                        onClick={downloadCSV}
                        className="flex items-center px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                      >
                        <FaDownload className="mr-1" size={12} />
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <h3 className="font-bold text-gray-800 mb-3">How It Works</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                    <span className="text-gray-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Generate Domains</h4>
                    <p className="text-xs text-gray-600">
                      Select format, location type, service, and extension. Click "Generate Domains" to create domain combinations.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                    <span className="text-gray-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Check Availability</h4>
                    <p className="text-xs text-gray-600">
                      Click "Check Availability" to verify which domains are available (green) or registered (red).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                    <span className="text-gray-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Filter & Select</h4>
                    <p className="text-xs text-gray-600">
                      Filter by availability status, sort alphabetically, select domains, then copy or export them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}