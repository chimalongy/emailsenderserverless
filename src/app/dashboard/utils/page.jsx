'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  FaFilter, 
  FaGlobe, 
  FaArrowRight, 
  FaCheckCircle,
  FaMapMarkerAlt
} from 'react-icons/fa'

export default function UtilsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const tools = [
    {
      id: 'dedupe',
      name: 'Dedupe List',
      description: 'Remove duplicates from lists, normalize text, and clean data',
      icon: <FaFilter className="w-6 h-6" />,
      href: '/dashboard/utils/dedupe',
      features: ['Remove duplicates', 'Case normalization', 'Whitespace trimming', 'CSV export'],
      color: 'bg-teal-400'
    },
    {
      id: 'domain-check',
      name: 'Domain Name Check',
      description: 'Check domain registration status and availability',
      icon: <FaGlobe className="w-6 h-6" />,
      href: '/dashboard/utils/domain-check',
      features: ['Registration status', 'WHOIS lookup', 'Bulk checking', 'Export results'],
      color: 'bg-teal-500'
    },
    {
      id: 'geo-domain',
      name: 'Geo Domain Generator',
      description: 'Generate geo-targeted domain names for specific locations',
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
      href: '/dashboard/utils/geo-domain-generator',
      features: ['City-based domains', 'Country TLD suggestions', 'Location keywords', 'Availability check'],
      color: 'bg-teal-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Utilities</h1>
        <p className="text-gray-600 mt-2">
          Tools to help you manage and optimize your data and domains
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-teal-100">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'recent', 'favorites'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-teal-700 hover:border-teal-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="bg-white rounded-xl border border-teal-100 hover:border-teal-200 transition-all duration-200 hover:shadow-md"
          >
            <div className="p-6">
              {/* Tool Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${tool.color}`}>
                  <div className="text-white">
                    {tool.icon}
                  </div>
                </div>
                <Link
                  href={tool.href}
                  className="inline-flex items-center px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-sm font-medium transition-colors border border-teal-200"
                >
                  Open Tool
                  <FaArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </div>

              {/* Tool Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tool.name}</h3>
                <p className="text-gray-600">{tool.description}</p>
              </div>

              {/* Features */}
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-teal-700 mb-2 uppercase tracking-wider">Features</h4>
                <ul className="space-y-1">
                  {tool.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <FaCheckCircle className="h-3 w-3 text-teal-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}