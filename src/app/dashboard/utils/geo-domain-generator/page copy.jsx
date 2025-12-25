'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaCopy, FaDownload, FaRandom, FaGlobe, FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa'

const states = [
  { name: 'Alabama', abbr: 'AL' },
  { name: 'Alaska', abbr: 'AK' },
  { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' },
  { name: 'California', abbr: 'CA' },
  { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' },
  { name: 'Delaware', abbr: 'DE' },
  { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' },
  { name: 'Hawaii', abbr: 'HI' },
  { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' },
  { name: 'Indiana', abbr: 'IN' },
  { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' },
  { name: 'Kentucky', abbr: 'KY' },
  { name: 'Louisiana', abbr: 'LA' },
  { name: 'Maine', abbr: 'ME' },
  { name: 'Maryland', abbr: 'MD' },
  { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Michigan', abbr: 'MI' },
  { name: 'Minnesota', abbr: 'MN' },
  { name: 'Mississippi', abbr: 'MS' },
  { name: 'Missouri', abbr: 'MO' },
  { name: 'Montana', abbr: 'MT' },
  { name: 'Nebraska', abbr: 'NB' },
  { name: 'Nevada', abbr: 'NV' },
  { name: 'New Hampshire', abbr: 'NH' },
  { name: 'New Jersey', abbr: 'NJ' },
  { name: 'New Mexico', abbr: 'NM' },
  { name: 'New York', abbr: 'NY' },
  { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota', abbr: 'ND' },
  { name: 'Ohio', abbr: 'OH' },
  { name: 'Oklahoma', abbr: 'OK' },
  { name: 'Oregon', abbr: 'OR' },
  { name: 'Pennsylvania', abbr: 'PA' },
  { name: 'Rhode Island', abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' },
  { name: 'South Dakota', abbr: 'SD' },
  { name: 'Tennessee', abbr: 'TN' },
  { name: 'Texas', abbr: 'TX' },
  { name: 'Utah', abbr: 'UT' },
  { name: 'Vermont', abbr: 'VT' },
  { name: 'Virginia', abbr: 'VA' },
  { name: 'Washington', abbr: 'WA' },
  { name: 'West Virginia', abbr: 'WV' },
  { name: 'Wisconsin', abbr: 'WI' },
  { name: 'Wyoming', abbr: 'WY' }
]

const cities = [
  { name: 'New York', abbr: 'NYC' },
  { name: 'Los Angeles', abbr: 'LA' },
  { name: 'Chicago', abbr: 'CHI' },
  { name: 'Houston', abbr: 'HTX' },
  { name: 'Phoenix', abbr: 'PHX' },
  { name: 'Philadelphia', abbr: 'PHL' },
  { name: 'San Antonio', abbr: 'SAT' },
  { name: 'San Diego', abbr: 'SD' },
  { name: 'Dallas', abbr: 'DFW' },
  { name: 'San Jose', abbr: 'SJ' },
  { name: 'Austin', abbr: 'ATX' },
  { name: 'Jacksonville', abbr: 'JAX' },
  { name: 'Fort Worth', abbr: 'FW' },
  { name: 'Columbus', abbr: 'CMH' },
  { name: 'Charlotte', abbr: 'CLT' },
  { name: 'Indianapolis', abbr: 'IND' },
  { name: 'San Francisco', abbr: 'SF' },
  { name: 'Seattle', abbr: 'SEA' },
  { name: 'Denver', abbr: 'DEN' },
  { name: 'Washington DC', abbr: 'DC' },
  { name: 'Boston', abbr: 'BOS' },
  { name: 'Nashville', abbr: 'BNA' },
  { name: 'Las Vegas', abbr: 'LV' },
  { name: 'Portland', abbr: 'PDX' },
  { name: 'Detroit', abbr: 'DET' },
  { name: 'Miami', abbr: 'MIA' },
  { name: 'Atlanta', abbr: 'ATL' },
  { name: 'Minneapolis', abbr: 'MSP' },
  { name: 'New Orleans', abbr: 'NOLA' },
  { name: 'Long Island', abbr: 'LI' }
]

const services = [
  'Plumber',
  'Electrician',
  'Cleaning',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Painting',
  'Carpenter',
  'Locksmith',
  'Handyman',
  'Real Estate',
  'Lawyer',
  'Doctor',
  'Dentist',
  'Restaurant',
  'Cafe',
  'Bakery',
  'Gym',
  'Yoga',
  'Massage',
  'Hair Salon',
  'Barber',
  'Nail Salon',
  'Tattoo',
  'Auto Repair',
  'Car Wash',
  'Moving',
  'Storage',
  'Insurance',
  'Tax Service',
  'Tutoring',
  'Pet Grooming',
  'Veterinarian',
  'Photography',
  'Catering',
  'Event Planning',
  'Web Design',
  'Marketing',
  'Consulting',
  'Accounting'
]

const extensions = ['.com', '.net', '.org', '.co', '.us', '.biz', '.info']

export default function GeoDomainGenerator() {
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
    abbreviation: 'asc',
    fullName: 'asc'
  })
  const [viewMode, setViewMode] = useState({
    abbreviation: 'compact',
    fullName: 'compact'
  })

  const locationList = selectedLocationType === 'state' ? states : cities

  const generateDomains = () => {
    const abbreviationDomains = []
    const fullNameDomains = []
    
    if (selectedLocation && !selectedService) {
      const locationData = locationList.find(loc => loc.abbr === selectedLocation)
      
      services.forEach(service => {
        const serviceSlug = service.toLowerCase().replace(/\s+/g, '')
        const locationAbbrSlug = selectedLocation.toLowerCase().replace(/\s+/g, '')
        const locationFullSlug = locationData ? locationData.name.toLowerCase().replace(/\s+/g, '') : ''
        
        if (domainFormat === 'service+location') {
          abbreviationDomains.push(`${serviceSlug}${locationAbbrSlug}${selectedExtension}`)
          if (locationFullSlug) {
            fullNameDomains.push(`${serviceSlug}${locationFullSlug}${selectedExtension}`)
          }
        } else {
          abbreviationDomains.push(`${locationAbbrSlug}${serviceSlug}${selectedExtension}`)
          if (locationFullSlug) {
            fullNameDomains.push(`${locationFullSlug}${serviceSlug}${selectedExtension}`)
          }
        }
      })
    } else if (selectedService && !selectedLocation) {
      locationList.forEach(location => {
        const serviceSlug = selectedService.toLowerCase().replace(/\s+/g, '')
        const locationAbbrSlug = location.abbr.toLowerCase().replace(/\s+/g, '')
        const locationFullSlug = location.name.toLowerCase().replace(/\s+/g, '')
        
        if (domainFormat === 'service+location') {
          abbreviationDomains.push(`${serviceSlug}${locationAbbrSlug}${selectedExtension}`)
          fullNameDomains.push(`${serviceSlug}${locationFullSlug}${selectedExtension}`)
        } else {
          abbreviationDomains.push(`${locationAbbrSlug}${serviceSlug}${selectedExtension}`)
          fullNameDomains.push(`${locationFullSlug}${serviceSlug}${selectedExtension}`)
        }
      })
    } else if (selectedLocation && selectedService) {
      const locationData = locationList.find(loc => loc.abbr === selectedLocation)
      const serviceSlug = selectedService.toLowerCase().replace(/\s+/g, '')
      const locationAbbrSlug = selectedLocation.toLowerCase().replace(/\s+/g, '')
      const locationFullSlug = locationData ? locationData.name.toLowerCase().replace(/\s+/g, '') : ''
      
      if (domainFormat === 'service+location') {
        abbreviationDomains.push(`${serviceSlug}${locationAbbrSlug}${selectedExtension}`)
        if (locationFullSlug) {
          fullNameDomains.push(`${serviceSlug}${locationFullSlug}${selectedExtension}`)
        }
      } else {
        abbreviationDomains.push(`${locationAbbrSlug}${serviceSlug}${selectedExtension}`)
        if (locationFullSlug) {
          fullNameDomains.push(`${locationFullSlug}${serviceSlug}${selectedExtension}`)
        }
      }
    }
    
    setAbbreviationDomains(abbreviationDomains.sort())
    setFullNameDomains(fullNameDomains.sort())
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

  const toggleSortOrder = (section) => {
    setSortOrder(prev => ({
      ...prev,
      [section]: prev[section] === 'asc' ? 'desc' : 'asc'
    }))
    
    if (section === 'abbreviation') {
      setAbbreviationDomains(prev => [...prev].reverse())
    } else if (section === 'fullName') {
      setFullNameDomains(prev => [...prev].reverse())
    }
  }

  const toggleViewMode = (section) => {
    setViewMode(prev => ({
      ...prev,
      [section]: prev[section] === 'compact' ? 'expanded' : 'compact'
    }))
  }

  const selectAllDomains = () => {
    const allDomains = [...abbreviationDomains, ...fullNameDomains]
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
      await navigator.clipboard.writeText(selectedDomains.join('\n'))
      alert('Domains copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadCSV = () => {
    const csvContent = [
      ['Domain', 'Format', 'Location Type', 'Location', 'Service'].join(','),
      ...selectedDomains.map(domain => {
        const isAbbreviation = abbreviationDomains.includes(domain)
        const locationType = isAbbreviation ? 'Abbreviation' : 'Full Name'
        return [domain, domainFormat, locationType, selectedLocation || 'All', selectedService || 'All'].join(',')
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
    const randomLocationType = Math.random() > 0.5 ? 'state' : 'city'
    setSelectedLocationType(randomLocationType)
    
    const currentLocationList = randomLocationType === 'state' ? states : cities
    const randomLocation = currentLocationList[Math.floor(Math.random() * currentLocationList.length)]
    setSelectedLocation(randomLocationType === 'state' ? randomLocation.abbr : randomLocation.abbr)
    
    const randomService = services[Math.floor(Math.random() * services.length)]
    setSelectedService(randomService)
    
    const randomExtension = extensions[Math.floor(Math.random() * extensions.length)]
    setSelectedExtension(randomExtension)
    
    const randomFormat = Math.random() > 0.5 ? 'service+location' : 'location+service'
    setDomainFormat(randomFormat)
  }

  useEffect(() => {
    if (cities.length > 0) {
      setSelectedLocation(cities[0].abbr)
    }
    if (services.length > 0) {
      setSelectedService(services[0])
    }
    generateDomains()
  }, [])

  const totalDomains = abbreviationDomains.length + fullNameDomains.length

  const renderDomainList = (domains, section) => {
    const maxVisible = viewMode[section] === 'compact' ? 10 : domains.length
    
    return (
      <div className="space-y-1">
        {domains.slice(0, maxVisible).map((domain, index) => (
          <div
            key={`${section}-${index}`}
            className={`flex items-center justify-between p-2 border rounded ${
              selectedDomains.includes(domain)
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedDomains.includes(domain)}
                onChange={() => toggleDomainSelection(domain)}
                className="h-3 w-3 text-purple-600 rounded"
              />
              <span className="ml-2 font-mono text-sm text-gray-800">{domain}</span>
            </div>
            
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  await navigator.clipboard.writeText(domain)
                  alert('Domain copied to clipboard!')
                } catch (err) {
                  console.error('Failed to copy:', err)
                }
              }}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <FaCopy size={14} />
            </button>
          </div>
        ))}
        
        {domains.length > 10 && (
          <div className="text-center pt-2">
            <button
              onClick={() => toggleViewMode(section)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              {viewMode[section] === 'compact' 
                ? `View all ${domains.length} domains ↓` 
                : 'Show less ↑'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Geo Domain Generator</h1>
          <p className="text-gray-600 text-sm">
            Generate service+location or location+service domain combinations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-3">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Format
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setDomainFormat('service+location')}
                      className={`flex-1 py-2 px-3 text-sm font-medium ${
                        domainFormat === 'service+location'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Service + Location
                    </button>
                    <button
                      onClick={() => setDomainFormat('location+service')}
                      className={`flex-1 py-2 px-3 text-sm font-medium ${
                        domainFormat === 'location+service'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Type
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedLocationType('city')
                        setSelectedLocation(cities[0]?.abbr || '')
                      }}
                      className={`flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center ${
                        selectedLocationType === 'city'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <FaMapMarkerAlt className="mr-1" />
                      City
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocationType('state')
                        setSelectedLocation(states[0]?.abbr || '')
                      }}
                      className={`flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center ${
                        selectedLocationType === 'state'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <FaGlobe className="mr-1" />
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
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500"
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
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500"
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
                            ? 'bg-purple-100 text-purple-700 border border-purple-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-3">
                  <button
                    onClick={generateDomains}
                    className="w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:opacity-90"
                  >
                    <FaSearch className="mr-1" />
                    Generate Domains
                  </button>

                  <button
                    onClick={randomizeInputs}
                    className="w-full flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                  >
                    <FaRandom className="mr-1" />
                    Randomize
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Generated Domains
                  </h2>
                  <p className="text-gray-600 text-xs">
                    {totalDomains} domains generated
                    {selectedLocation && ` for ${selectedLocation}`}
                    {selectedService && ` with ${selectedService}`}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-600">
                    Selected: <span className="font-bold">{selectedDomains.length}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={selectAllDomains}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
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

              <div className="bg-gray-50 p-3 rounded mb-3">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Current Format</div>
                  <div className="text-base font-bold text-gray-800">
                    {domainFormat === 'service+location' ? (
                      <>
                        <span className="text-green-600">{selectedService || 'Service'}</span>
                        <span className="text-blue-600 mx-1">+</span>
                        <span className="text-blue-600">{selectedLocation || 'Location'}</span>
                        <span className="text-purple-600">{selectedExtension}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-blue-600">{selectedLocation || 'Location'}</span>
                        <span className="text-blue-600 mx-1">+</span>
                        <span className="text-green-600">{selectedService || 'Service'}</span>
                        <span className="text-purple-600">{selectedExtension}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Abbreviation Domains Accordion */}
              {abbreviationDomains.length > 0 && (
                <div className="mb-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                    <button
                      onClick={() => toggleSection('abbreviation')}
                      className="flex-1 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                          <span className="text-blue-600 text-xs font-bold">A</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800">Abbreviation Domains</h3>
                          <p className="text-xs text-gray-600">
                            {abbreviationDomains.length} domains • {selectedDomains.filter(d => abbreviationDomains.includes(d)).length} selected
                          </p>
                        </div>
                      </div>
                      {expandedSections.abbreviation ? (
                        <FaChevronUp className="text-gray-500" />
                      ) : (
                        <FaChevronDown className="text-gray-500" />
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSortOrder('abbreviation')
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title={`Sort ${sortOrder.abbreviation === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          {sortOrder.abbreviation === 'asc' ? (
                            <FaSortAlphaDown size={14} />
                          ) : (
                            <FaSortAlphaUp size={14} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllInSection(abbreviationDomains)
                          }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 cursor-pointer"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {expandedSections.abbreviation && (
                    <div className="p-3 max-h-[400px] overflow-y-auto">
                      {renderDomainList(abbreviationDomains, 'abbreviation')}
                    </div>
                  )}
                </div>
              )}

              {/* Full Name Domains Accordion */}
              {fullNameDomains.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                    <button
                      onClick={() => toggleSection('fullName')}
                      className="flex-1 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                          <span className="text-green-600 text-xs font-bold">F</span>
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-gray-800">Full Name Domains</h3>
                          <p className="text-xs text-gray-600">
                            {fullNameDomains.length} domains • {selectedDomains.filter(d => fullNameDomains.includes(d)).length} selected
                          </p>
                        </div>
                      </div>
                      {expandedSections.fullName ? (
                        <FaChevronUp className="text-gray-500" />
                      ) : (
                        <FaChevronDown className="text-gray-500" />
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSortOrder('fullName')
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title={`Sort ${sortOrder.fullName === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          {sortOrder.fullName === 'asc' ? (
                            <FaSortAlphaDown size={14} />
                          ) : (
                            <FaSortAlphaUp size={14} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            selectAllInSection(fullNameDomains)
                          }}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 cursor-pointer"
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {expandedSections.fullName && (
                    <div className="p-3 max-h-[400px] overflow-y-auto">
                      {renderDomainList(fullNameDomains, 'fullName')}
                    </div>
                  )}
                </div>
              )}

              {selectedDomains.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      {selectedDomains.length} domains selected
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={copySelectedDomains}
                        className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        <FaCopy className="mr-1" size={12} />
                        Copy Selected
                      </button>
                      
                      <button
                        onClick={downloadCSV}
                        className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        <FaDownload className="mr-1" size={12} />
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-3">How It Works</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Choose Format</h4>
                    <p className="text-xs text-gray-600">
                      Select service+location (plumbernyc.com) or location+service (nycplumber.com)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-blue-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Select Inputs</h4>
                    <p className="text-xs text-gray-600">
                      Choose location or service (or both). Leave one empty for all combinations.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-blue-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Generate & Select</h4>
                    <p className="text-xs text-gray-600">
                      Click generate, expand sections to view all domains, sort alphabetically, select domains, then copy or export them.
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