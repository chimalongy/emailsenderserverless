'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FaBars, 
  FaTimes, 
  FaSignOutAlt, 
  FaUser,
  FaTachometerAlt,
  FaEnvelope,
  FaPaperPlane,
  FaChevronDown,
  FaCog
} from 'react-icons/fa'
import Image from 'next/image'

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mobileMenuRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle escape key to close menus
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSignOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [signOut, router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-700">Loading your dashboard</p>
            <p className="text-sm text-gray-500">Please wait a moment...</p>
          </div>
        </div>
      </div>
    )
  }

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: <FaTachometerAlt className="w-5 h-5" />,
      description: 'Overview & Analytics'
    },
    { 
      name: 'Emails', 
      href: '/dashboard/emails', 
      icon: <FaEnvelope className="w-5 h-5" />,
      description: 'Manage email templates'
    },
    { 
      name: 'Outbounds', 
      href: '/dashboard/outbounds', 
      icon: <FaPaperPlane className="w-5 h-5" />,
      description: 'Outbound campaigns'
    },
  ]

  const userNavigation = [
    { name: 'Profile Settings', href: '/dashboard/settings', icon: <FaUser className="w-4 h-4" /> },
    { name: 'Account Settings', href: '/dashboard/settings/account', icon: <FaCog className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and mobile menu */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden -ml-2 mr-3 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <FaTimes className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <FaBars className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  href="/dashboard" 
                  className="flex items-center space-x-3 group"
                  aria-label="Go to dashboard"
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                      <FaEnvelope className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Email Automation
                    </h1>
                    <p className="text-xs text-gray-500 hidden md:block">Professional Email Marketing</p>
                  </div>
                </Link>
              </div>

              {/* Desktop navigation */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      relative group inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200 ease-out
                      ${pathname === item.href
                        ? 'text-indigo-700 bg-indigo-50 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                    aria-current={pathname === item.href ? 'page' : undefined}
                  >
                    <span className="mr-2 opacity-75">{item.icon}</span>
                    {item.name}
                    {pathname === item.href && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full"></span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              {/* User info with dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  disabled={isLoading}
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {user.email}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <FaChevronDown className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-5">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {user.email}
                      </p>
                    </div>
                    
                    <div className="py-2">
                      {userNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 group transition-colors duration-150"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="mr-3 text-gray-400 group-hover:text-gray-600">
                            {item.icon}
                          </span>
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        <FaSignOutAlt className="mr-3 h-4 w-4" />
                        {isLoading ? 'Signing out...' : 'Sign out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation menu */}
      <div
        ref={mobileMenuRef}
        id="mobile-menu"
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div className="pt-5 pb-4 px-6 h-full flex flex-col">
          {/* Mobile menu header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <FaEnvelope className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <p className="text-xs text-gray-500">Email Automation</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              aria-label="Close menu"
            >
              <FaTimes className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          
          {/* Mobile navigation items */}
          <nav className="space-y-1 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                  ${pathname === item.href
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-l-4 border-indigo-500 shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span className={`mr-3 ${pathname === item.href ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div>{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                </div>
              </Link>
            ))}
          </nav>
          
          {/* Mobile user info */}
          <div className="pt-6 border-t border-gray-200">
            <div className="px-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              {userNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-3 text-gray-400">
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </div>
            
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full mt-4 flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSignOutAlt className="mr-3 h-4 w-4" />
              {isLoading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6 md:mb-8">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    <FaTachometerAlt className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </li>
                {pathname !== '/dashboard' && (
                  <>
                    <li>
                      <div className="flex items-center">
                        <span className="text-gray-400 mx-2">/</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {pathname.split('/').pop()?.replace('-', ' ') || ''}
                        </span>
                      </div>
                    </li>
                  </>
                )}
              </ol>
            </nav>
          </div>

          {/* Page content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-3 md:p-8">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Email Automation Platform • {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}