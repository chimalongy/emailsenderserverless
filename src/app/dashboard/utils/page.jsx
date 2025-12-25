'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  FaFilter, 
  FaGlobe, 
  FaArrowRight, 
  FaCheckCircle,
  FaMapMarkerAlt,
  FaSearch
} from 'react-icons/fa'

export default function UtilsPage() {
  const tools = [
    {
      id: 'dedupe',
      name: 'Dedupe List',
      description: 'Remove duplicates from lists, normalize text, and clean data',
      icon: <FaFilter className="w-6 h-6" />,
      href: '/dashboard/utils/dedupe',
      features: ['Remove duplicates', 'Case normalization', 'Whitespace trimming', 'CSV export'],
    },
    {
      id: 'domain-check',
      name: 'Domain Name Check',
      description: 'Check domain registration status and availability',
      icon: <FaGlobe className="w-6 h-6" />,
      href: '/dashboard/utils/domain-check',
      features: ['Registration status', 'WHOIS lookup', 'Bulk checking', 'Export results'],
    },
    {
      id: 'domain-research',
      name: 'Domain Research Tool',
      description: 'Comprehensive domain analysis with risk assessment',
      icon: <FaSearch className="w-6 h-6" />,
      href: '/dashboard/utils/domain-research',
      features: [
        'RDAP (WHOIS) lookup',
        'Historical data analysis',
        'Risk scoring',
        'Bulk research',
      ],
    },
    {
      id: 'geo-domain',
      name: 'Geo Domain Generator',
      description: 'Generate geo-targeted domain names for specific locations',
      icon: <FaMapMarkerAlt className="w-6 h-6" />,
      href: '/dashboard/utils/geo-domain-generator',
      features: ['City-based domains', 'Country TLD suggestions', 'Location keywords', 'Availability check'],
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
     

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="bg-white rounded-xl border border-teal-200 hover:border-teal-300 hover:shadow-md transition-all duration-200"
          >
            <div className="p-6">
              {/* Tool Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-teal-100 text-teal-600">
                  {tool.icon}
                </div>
                <Link
                  href={tool.href}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                >
                  Open Tool
                  <FaArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </div>

              {/* Tool Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{tool.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{tool.description}</p>
              </div>

              {/* Features */}
              <div className="mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-teal-600">
                  Features
                </h4>
                <ul className="space-y-1">
                  {tool.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <FaCheckCircle className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0 text-teal-500" />
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info Section */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-6">
        <div className="max-w-4xl">
          <h2 className="text-xl font-bold text-gray-800 mb-4">About Our Tools</h2>
          <p className="text-gray-600 mb-6">
            All tools are designed to be intuitive and efficient, helping you save time on domain research and data management tasks.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <FaGlobe className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Domain Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get current registration data including registrar, nameservers, and contact information.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <FaSearch className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Historical Data</h3>
              </div>
              <p className="text-sm text-gray-600">
                Check historical snapshots and see how domains have been used over time.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <FaCheckCircle className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Bulk Processing</h3>
              </div>
              <p className="text-sm text-gray-600">
                Process multiple domains or data entries efficiently with bulk operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}