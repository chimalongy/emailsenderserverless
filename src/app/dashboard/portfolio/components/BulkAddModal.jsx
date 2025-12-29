'use client'

import { useState, useEffect } from 'react'
import { FaTimes, FaInfo, FaDollarSign, FaArrowRight, FaArrowLeft, FaCopy } from 'react-icons/fa'

export default function BulkAddModal({ isOpen, onClose, onBulkAdd }) {
  const [step, setStep] = useState(1) // 1: Enter domains, 2: Set prices
  const [bulkDomains, setBulkDomains] = useState('')
  const [parsedDomains, setParsedDomains] = useState([])
  const [domainPrices, setDomainPrices] = useState({})
  const [singlePrice, setSinglePrice] = useState('')
  const [error, setError] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setBulkDomains('')
      setParsedDomains([])
      setDomainPrices({})
      setSinglePrice('')
      setError('')
    }
  }, [isOpen])

  // Parse domains when moving to step 2
  const parseAndValidateDomains = () => {
    if (!bulkDomains.trim()) {
      setError('Please enter domain names')
      return false
    }

    const domains = bulkDomains
      .split('\n')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0 && domain.includes('.'))
      .map(domain => domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))

    if (domains.length === 0) {
      setError('No valid domains found. Please enter domains separated by new lines.')
      return false
    }

    // Check for duplicates
    const uniqueDomains = [...new Set(domains)]
    if (uniqueDomains.length !== domains.length) {
      const duplicateCount = domains.length - uniqueDomains.length
      setError(`Found ${duplicateCount} duplicate domain${duplicateCount > 1 ? 's' : ''}. They will be merged.`)
    } else {
      setError('')
    }

    setParsedDomains(uniqueDomains)
    
    // Initialize prices to empty strings
    const initialPrices = {}
    uniqueDomains.forEach(domain => {
      initialPrices[domain] = ''
    })
    setDomainPrices(initialPrices)
    
    return true
  }

  const handleNextStep = () => {
    if (parseAndValidateDomains()) {
      setStep(2)
    }
  }

  const handlePrevStep = () => {
    setStep(1)
  }

  const handleDomainPriceChange = (domain, price) => {
    // Ensure we're updating with a string value
    setDomainPrices(prev => ({
      ...prev,
      [domain]: price.toString()
    }))
  }

  const applySinglePriceToAll = () => {
    if (!singlePrice) {
      setError('Please enter a price first')
      return
    }

    const newPrices = { ...domainPrices }
    Object.keys(newPrices).forEach(domain => {
      newPrices[domain] = singlePrice
    })
    setDomainPrices(newPrices)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Prepare domains with their prices
    const domainsWithPrices = parsedDomains.map(domain => {
      const priceStr = domainPrices[domain];
      // Parse the price, default to 0 if empty or invalid
      let purchasePrice = 0;
      
      if (priceStr && priceStr.trim() !== '') {
        const parsed = parseFloat(priceStr);
        purchasePrice = isNaN(parsed) ? 0 : parsed;
      }
      
      return {
        name: domain,
        purchasePrice: purchasePrice
      }
    })

    // Log for debugging
    console.log('Submitting domains with prices:', domainsWithPrices);
    
    onBulkAdd(domainsWithPrices)
    onClose()
  }

  const handleSinglePriceChange = (e) => {
    setSinglePrice(e.target.value)
    setError('')
  }

  const totalPrice = Object.values(domainPrices).reduce((sum, price) => {
    const parsedPrice = parseFloat(price) || 0;
    return sum + parsedPrice;
  }, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Bulk Add Domains</h3>
              <p className="text-sm text-gray-500 mt-1">
                Step {step} of 2: {step === 1 ? 'Enter domains' : 'Set prices'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }}>
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 1 ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'}`}>
                    1
                  </div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 2 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    2
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {parsedDomains.length > 0 && (
                    <span>{parsedDomains.length} domain{parsedDomains.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex mt-2">
                <div className={`h-1 flex-1 ${step >= 1 ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
                <div className={`h-1 flex-1 ${step >= 2 ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Enter Domains */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter domain names (one per line):
                  </label>
                  <textarea
                    rows="12"
                    placeholder="example.com&#10;mysite.org&#10;app.io"
                    value={bulkDomains}
                    onChange={(e) => {
                      setBulkDomains(e.target.value)
                      setError('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex">
                    <FaInfo className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Tips for bulk import:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Enter one domain per line (e.g., example.com)</li>
                        <li>• You can include full URLs - they'll be automatically cleaned</li>
                        <li>• Duplicate domains will be removed automatically</li>
                        <li>• You'll set prices for each domain in the next step</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Set Prices */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Single Price Option */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-teal-800">Set Price for All Domains</h4>
                    <button
                      type="button"
                      onClick={applySinglePriceToAll}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <FaCopy className="mr-1.5 h-3 w-3" />
                      Apply to All
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaDollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter price for all domains"
                        value={singlePrice}
                        onChange={handleSinglePriceChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      per domain
                    </span>
                  </div>
                  <p className="text-xs text-teal-600 mt-2">
                    Click "Apply to All" to fill all price fields with this value
                  </p>
                </div>

                {/* Domain List with Price Inputs */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-gray-700">
                        Individual Domain Prices
                        <span className="ml-2 text-xs text-gray-500">
                          ({parsedDomains.length} domain{parsedDomains.length !== 1 ? 's' : ''})
                        </span>
                      </h5>
                      <div className="text-xs text-gray-500">
                        Total: ${totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                    {parsedDomains.map((domain, index) => (
                      <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate flex items-center">
                              <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded mr-2">
                                {index + 1}
                              </span>
                              {domain}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center space-x-3">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaDollarSign className="h-3 w-3 text-gray-400" />
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={domainPrices[domain] || ''}
                                onChange={(e) => handleDomainPriceChange(domain, e.target.value)}
                                className="w-32 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Domains</p>
                      <p className="text-xl font-bold text-gray-800">{parsedDomains.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Price</p>
                      <p className="text-xl font-bold text-teal-600">${totalPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Average Price</p>
                      <p className="text-xl font-bold text-gray-800">
                        ${parsedDomains.length > 0 ? (totalPrice / parsedDomains.length).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Navigation Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {step === 1 ? (
                  <span>Enter your domain list to continue</span>
                ) : (
                  <span>Set prices for {parsedDomains.length} domain{parsedDomains.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                  >
                    <FaArrowLeft className="mr-2" />
                    Back
                  </button>
                )}
                
                {step === 1 ? (
                  <button
                    type="submit"
                    disabled={!bulkDomains.trim()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Set Prices
                    <FaArrowRight className="ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
                  >
                    Add {parsedDomains.length} Domain{parsedDomains.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}