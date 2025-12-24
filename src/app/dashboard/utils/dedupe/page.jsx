'use client'

import { useState, useRef } from 'react'
import { 
  FaCopy, 
  FaDownload, 
  FaTrash, 
  FaCheck, 
  FaSortAlphaDown,
  FaFilter,
  FaUndo,
  FaInfoCircle
} from 'react-icons/fa'

export default function DedupeListPage() {
  const [inputText, setInputText] = useState('')
  const [processedList, setProcessedList] = useState([])
  const [originalCount, setOriginalCount] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [removedCount, setRemovedCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sortOrder, setSortOrder] = useState('original')
  const textareaRef = useRef(null)

  const processList = () => {
    if (!inputText.trim()) return
    
    setIsProcessing(true)
    
    // Simulate processing delay
    setTimeout(() => {
      const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      setOriginalCount(lines.length)
      
      // Normalize and deduplicate
      const normalizedSet = new Set()
      const processed = []
      
      lines.forEach(line => {
        const normalized = line.toLowerCase().trim()
        if (!normalizedSet.has(normalized)) {
          normalizedSet.add(normalized)
          processed.push({
            original: line,
            normalized: normalized,
            index: processed.length
          })
        }
      })
      
      setProcessedList(processed)
      setProcessedCount(processed.length)
      setRemovedCount(lines.length - processed.length)
      setIsProcessing(false)
    }, 500)
  }

  const clearList = () => {
    setInputText('')
    setProcessedList([])
    setOriginalCount(0)
    setProcessedCount(0)
    setRemovedCount(0)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const copyToClipboard = () => {
    const text = processedList.map(item => item.original).join('\n')
    navigator.clipboard.writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err))
  }

  const exportAsCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Original"].concat(processedList.map(item => `"${item.original}"`)).join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'deduped_list.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const sortList = (order) => {
    const sorted = [...processedList]
    if (order === 'alpha') {
      sorted.sort((a, b) => a.normalized.localeCompare(b.normalized))
    } else if (order === 'reverse') {
      sorted.sort((a, b) => b.normalized.localeCompare(a.normalized))
    }
    setProcessedList(sorted)
    setSortOrder(order)
  }

  const sampleData = [
    'John Doe',
    'john doe',
    'JOHN DOE',
    'Jane Smith',
    'jane smith',
    'Bob Johnson',
    'bob johnson',
    'Bob Johnson',
    'Alice Brown',
    'alice brown'
  ]

  const loadSample = () => {
    setInputText(sampleData.join('\n'))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* <div>
          <h1 className="text-2xl font-bold text-gray-800">Dedupe List</h1>
          <p className="text-gray-600">Remove duplicates and normalize text from your lists</p>
        </div> */}
        <div className="flex items-center space-x-2">
          <button
            onClick={loadSample}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={clearList}
            className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <FaTrash className="inline mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Original Items</p>
              <p className="text-2xl font-bold text-blue-800">{originalCount}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaInfoCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">After Dedupe</p>
              <p className="text-2xl font-bold text-green-800">{processedCount}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Duplicates Removed</p>
              <p className="text-2xl font-bold text-red-800">{removedCount}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <FaFilter className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Input List</h2>
              <span className="text-sm text-gray-500">Paste your list below</span>
            </div>
            
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your list here (one item per line)...

Example:
john@example.com
John@example.com
JOHN@EXAMPLE.COM
jane@domain.com
jane@domain.com"
              className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none font-mono text-sm"
              rows={10}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {inputText.split('\n').filter(l => l.trim()).length} items
              </div>
              <button
                onClick={processList}
                disabled={!inputText.trim() || isProcessing}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Dedupe List'}
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Processed List</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => sortList('alpha')}
                  className={`px-3 py-1 text-sm rounded ${sortOrder === 'alpha' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <FaSortAlphaDown className="inline mr-1" />
                  Sort A-Z
                </button>
                <button
                  onClick={() => sortList('original')}
                  className={`px-3 py-1 text-sm rounded ${sortOrder === 'original' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <FaUndo className="inline mr-1" />
                  Original Order
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                  <div className="col-span-1">#</div>
                  <div className="col-span-11">Item</div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {processedList.length > 0 ? (
                  processedList.map((item, index) => (
                    <div 
                      key={index} 
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                    >
                      <div className="grid grid-cols-12 gap-4 text-sm">
                        <div className="col-span-1 font-mono text-gray-500">{index + 1}</div>
                        <div className="col-span-11 font-medium">{item.original}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <FaFilter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Processed results will appear here</p>
                    <p className="text-sm mt-1">Click "Dedupe List" to start</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {processedCount} unique items
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  disabled={processedCount === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaCopy className="inline mr-2" />
                  Copy
                </button>
                <button
                  onClick={exportAsCSV}
                  disabled={processedCount === 0}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaDownload className="inline mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}