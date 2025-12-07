'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaBars, FaTimes } from 'react-icons/fa'

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Emails', href: '/dashboard/emails' },
    { name: 'Outbounds', href: '/dashboard/outbounds' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden -ml-2 mr-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <FaTimes className="h-5 w-5" />
                ) : (
                  <FaBars className="h-5 w-5" />
                )}
              </button>

              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  📧 Email Automation
                </h1>
              </div>

              {/* Desktop navigation */}
              <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                {tabs.map((tab) => (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      pathname === tab.href
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* User info and sign out */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-700 truncate max-w-[120px] md:max-w-[180px] lg:max-w-none">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation menu */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-5 pb-4 px-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-1 flex-1">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center px-3 py-3 rounded-md text-base font-medium ${
                  pathname === tab.href
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </div>
          
          <div className="pt-8 border-t border-gray-200">
            <div className="px-3">
              <p className="text-sm font-medium text-gray-500">Signed in as</p>
              <p className="mt-1 text-sm text-gray-900 truncate">{user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="w-full mt-4 text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main className="py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}