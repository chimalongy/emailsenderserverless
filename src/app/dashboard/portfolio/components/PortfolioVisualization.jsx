'use client'

import { useState, useEffect } from 'react'
import { 
  FaChartPie, 
  FaChartBar, 
  FaChartLine, 
  FaGlobe,
  FaDollarSign,
  FaCalendar,
  FaRegCalendar,
  FaFilter,
  FaDownload
} from 'react-icons/fa'

const PortfolioVisualization = ({ domains }) => {
  const [activeChart, setActiveChart] = useState('status')
  const [timeFilter, setTimeFilter] = useState('all')

  // Filter domains based on time filter
  const filteredDomains = domains.filter(domain => {
    if (timeFilter === 'all') return true
    if (timeFilter === 'last30') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return new Date(domain.added_date) > thirtyDaysAgo
    }
    if (timeFilter === 'last90') {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      return new Date(domain.added_date) > ninetyDaysAgo
    }
    if (timeFilter === 'year2024') {
      return new Date(domain.added_date).getFullYear() === 2024
    }
    return true
  })

  // Calculate data for charts
  const calculateChartData = () => {
    switch (activeChart) {
      case 'status':
        const statusCounts = {}
        filteredDomains.forEach(domain => {
          statusCounts[domain.status] = (statusCounts[domain.status] || 0) + 1
        })
        return {
          labels: Object.keys(statusCounts),
          data: Object.values(statusCounts),
          colors: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#6B7280']
        }

      case 'registrar':
        const registrarCounts = {}
        filteredDomains.forEach(domain => {
          const registrar = domain.registrar || 'Unknown'
          registrarCounts[registrar] = (registrarCounts[registrar] || 0) + 1
        })
        // Sort by count and take top 10
        const sortedRegistrars = Object.entries(registrarCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
        return {
          labels: sortedRegistrars.map(r => r[0]),
          data: sortedRegistrars.map(r => r[1]),
          colors: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#64748B'
          ]
        }

      case 'investment':
        const purchasePrices = filteredDomains
          .filter(d => d.purchase_price > 0)
          .map(d => d.purchase_price)
        const ranges = [
          { label: '$0-10', min: 0, max: 10 },
          { label: '$10-50', min: 10, max: 50 },
          { label: '$50-100', min: 50, max: 100 },
          { label: '$100-500', min: 100, max: 500 },
          { label: '$500+', min: 500, max: Infinity }
        ]
        const rangeCounts = ranges.map(range => 
          purchasePrices.filter(price => price >= range.min && price < range.max).length
        )
        return {
          labels: ranges.map(r => r.label),
          data: rangeCounts,
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
        }

      case 'timeline':
        // Group by month
        const monthlyData = {}
        filteredDomains.forEach(domain => {
          const date = new Date(domain.added_date)
          const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
          monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1
        })
        
        const sortedMonths = Object.keys(monthlyData).sort()
        return {
          labels: sortedMonths,
          data: sortedMonths.map(month => monthlyData[month]),
          colors: ['#3B82F6']
        }

      default:
        return { labels: [], data: [], colors: [] }
    }
  }

  const chartData = calculateChartData()
  const totalDomains = filteredDomains.length

  // Calculate portfolio metrics
  const calculateMetrics = () => {
    const totalInvestment = filteredDomains.reduce((sum, domain) => sum + (domain.purchase_price || 0), 0)
    const totalSales = filteredDomains.filter(d => d.sold).reduce((sum, domain) => sum + (domain.sale_price || 0), 0)
    const totalProfit = totalSales - totalInvestment
    const averagePurchasePrice = totalInvestment / filteredDomains.length || 0
    const averageSalePrice = totalSales / (filteredDomains.filter(d => d.sold).length || 1)

    return {
      totalInvestment,
      totalSales,
      totalProfit,
      averagePurchasePrice,
      averageSalePrice
    }
  }

  const metrics = calculateMetrics()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const renderChart = () => {
    const maxValue = Math.max(...chartData.data)
    
    return (
      <div className="mt-6">
        <div className="space-y-4">
          {chartData.labels.map((label, index) => {
            const value = chartData.data[index]
            const percentage = totalDomains > 0 ? (value / totalDomains) * 100 : 0
            const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0
            
            return (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-600">{value} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: chartData.colors[index % chartData.colors.length]
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Portfolio Visualization</h3>
          <p className="text-gray-600 text-sm">Visual insights into your domain portfolio</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Time</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="year2024">2024</option>
          </select>
          <button
            onClick={() => {
              // Export visualization data
              const csvData = chartData.labels.map((label, i) => 
                `${label},${chartData.data[i]}`
              ).join('\n')
              const blob = new Blob([`Category,Count\n${csvData}`], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `portfolio-${activeChart}-${timeFilter}.csv`
              a.click()
            }}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaDownload className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => setActiveChart('status')}
          className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
            activeChart === 'status'
              ? 'border-teal-300 bg-teal-50 text-teal-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaChartPie className="h-6 w-6 mb-2" />
          <span className="text-sm font-medium">By Status</span>
        </button>
        
        <button
          onClick={() => setActiveChart('registrar')}
          className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
            activeChart === 'registrar'
              ? 'border-teal-300 bg-teal-50 text-teal-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaGlobe className="h-6 w-6 mb-2" />
          <span className="text-sm font-medium">By Registrar</span>
        </button>
        
        <button
          onClick={() => setActiveChart('investment')}
          className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
            activeChart === 'investment'
              ? 'border-teal-300 bg-teal-50 text-teal-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaDollarSign className="h-6 w-6 mb-2" />
          <span className="text-sm font-medium">By Investment</span>
        </button>
        
        <button
          onClick={() => setActiveChart('timeline')}
          className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
            activeChart === 'timeline'
              ? 'border-teal-300 bg-teal-50 text-teal-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FaChartLine className="h-6 w-6 mb-2" />
          <span className="text-sm font-medium">Timeline</span>
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Domains</p>
          <p className="text-2xl font-bold text-gray-800">{totalDomains}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Investment</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalInvestment)}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalSales)}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total Profit</p>
          <p className={`text-2xl font-bold ${
            metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(metrics.totalProfit)}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Avg Purchase</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.averagePurchasePrice)}</p>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700">
            {activeChart === 'status' && 'Domains by Status'}
            {activeChart === 'registrar' && 'Top 10 Registrars'}
            {activeChart === 'investment' && 'Investment Distribution'}
            {activeChart === 'timeline' && 'Acquisition Timeline'}
          </h4>
          <div className="text-sm text-gray-500">
            {totalDomains} domains shown
          </div>
        </div>
        
        {totalDomains > 0 ? (
          renderChart()
        ) : (
          <div className="text-center py-12">
            <FaChartBar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available for the selected filters</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {chartData.labels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chartData.labels.map((label, index) => (
            <div key={label} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: chartData.colors[index % chartData.colors.length] }}
              />
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PortfolioVisualization