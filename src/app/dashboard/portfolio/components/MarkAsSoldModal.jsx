'use client'

import { useState, useEffect } from 'react'
import {
  FaCheckCircle,
  FaDollarSign,
  FaShareAlt,
  FaLock,
  FaTimes,
  FaSpinner,
} from 'react-icons/fa'

export default function MarkAsSoldModal({
  domain,
  isOpen,
  onClose,
  onMarkAsSold,
}) {
  const [salePrice, setSalePrice] = useState('')
  const [shareSaleReport, setShareSaleReport] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => (document.body.style.overflow = '')
  }, [isOpen])

  useEffect(() => {
    if (isOpen && domain) {
      setSalePrice('')
      setShareSaleReport(false)
      setSubmitting(false)
    }
  }, [isOpen, domain])

  if (!isOpen || !domain) return null

  const calculateProfitLoss = () => {
    if (!salePrice || isNaN(salePrice)) return null
    const sale = parseFloat(salePrice)
    const purchase = domain.purchase_price || 0
    const diff = sale - purchase
    const pct = purchase ? ((diff / purchase) * 100).toFixed(1) : 100
    return { diff, pct, isProfit: diff >= 0 }
  }

  const profit = calculateProfitLoss()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await onMarkAsSold({
      domainId: domain.id,
      salePrice: parseFloat(salePrice),
      shareSaleReport,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FaCheckCircle className="text-green-600 text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Congratulations!</h3>
              <p className="text-sm text-gray-600">
                You sold <span className="font-semibold">{domain.name}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sale Price
            </label>
            <div className="relative">
              <FaDollarSign className="absolute left-3 top-3 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {shareSaleReport ? (
                <FaShareAlt className="text-green-600" />
              ) : (
                <FaLock className="text-gray-400" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {shareSaleReport ? 'Public Sale' : 'Private Sale'}
                </p>
                <p className="text-xs text-gray-500">
                  {shareSaleReport
                    ? 'Visible in reports'
                    : 'Only visible to you'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={shareSaleReport}
              onChange={(e) => setShareSaleReport(e.target.checked)}
              className="h-5 w-5 text-green-600"
            />
          </div>

          {/* Profit */}
          {profit && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="text-gray-600">Profit / Loss</p>
              <p
                className={`text-lg font-bold ${
                  profit.isProfit ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ${profit.diff.toFixed(2)} ({profit.isProfit ? '+' : ''}
                {profit.pct}%)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? (
                <FaSpinner className="animate-spin mx-auto" />
              ) : (
                'Mark as Sold'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
