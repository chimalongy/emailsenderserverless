'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  FaFilter, 
  FaGlobe, 
  FaArrowRight, 
  FaCheckCircle
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
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'domain-check',
      name: 'Domain Name Check',
      description: 'Check domain registration status and availability',
      icon: <FaGlobe className="w-6 h-6" />,
      href: '/dashboard/utils/domain-check',
      features: ['Registration status', 'WHOIS lookup', 'Bulk checking', 'Export results'],
      color: 'from-green-500 to-emerald-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Utility Tools</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Powerful tools to streamline your workflow. Process lists, check domains, and automate repetitive tasks.
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg"
          >
            <div className="p-6">
              {/* Tool Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${tool.color}`}>
                  <div className="text-white">
                    {tool.icon}
                  </div>
                </div>
                <Link
                  href={tool.href}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
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
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Features</h4>
                <ul className="space-y-1">
                  {tool.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <FaCheckCircle className="h-3 w-3 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Recently used</span>
                  <span className="text-gray-800 font-medium">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}