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
  FaHome,
  FaChevronRight,
  FaSearch,
  FaTools,
  FaFilter,
  FaGlobe
} from 'react-icons/fa'

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
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [signOut, router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-teal-500 border-t-transparent mx-auto"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-800">Loading dashboard</p>
            <p className="text-sm text-gray-500">Please wait...</p>
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
      name: 'Email Accounts', 
      href: '/dashboard/emails', 
      icon: <FaEnvelope className="w-5 h-5" />,
      description: 'Manage email accounts'
    },
    { 
      name: 'Campaigns', 
      href: '/dashboard/outbounds', 
      icon: <FaPaperPlane className="w-5 h-5" />,
      description: 'Manage campaigns'
    },
    { 
      name: 'Scrape Emails', 
      href: '/dashboard/scrape-emails', 
      icon: <FaSearch className="w-5 h-5" />,
      description: 'Find and scrape email addresses'
    },
    { 
      name: 'Utils', 
      href: '/dashboard/utils', 
      icon: <FaTools className="w-5 h-5" />,
      description: 'Tools and utilities'
    },
    { 
      name: 'Dedupe List', 
      href: '/dashboard/utils/dedupe', 
      icon: <FaFilter className="w-5 h-5" />,
      description: 'Remove duplicates and normalize lists'
    },
    { 
      name: 'Domain Check', 
      href: '/dashboard/utils/domain-check', 
      icon: <FaGlobe className="w-5 h-5" />,
      description: 'Check domain registration status'
    },
  ]

  const userNavigation = [
    { name: 'Profile', href: '/dashboard/settings', icon: <FaUser className="w-4 h-4" /> },
  ]

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/dashboard/emails') return 'Email Accounts'
    if (pathname === '/dashboard/outbounds') return 'Campaigns'
    if (pathname === '/dashboard/settings') return 'Settings'
    if (pathname === '/dashboard/scrape-emails') return 'Scrape Emails'
    if (pathname === '/dashboard/utils') return 'Utils'
    if (pathname === '/dashboard/utils/dedupe') return 'Dedupe List'
    if (pathname === '/dashboard/utils/domain-check') return 'Domain Check'
    return pathname.split('/').pop()?.replace(/-/g, ' ') || ''
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between h-14">
            {/* Left side - Logo and mobile menu */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden -ml-1 mr-2 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
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
                  className="flex items-center space-x-2"
                  aria-label="Go to dashboard"
                >
                  <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
                    <FaEnvelope className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-bold text-gray-800">MailFlow</h1>
                  </div>
                </Link>
              </div>

              {/* Desktop navigation */}
              <div className="hidden lg:ml-6 lg:flex lg:space-x-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      relative flex items-center px-3 py-2 text-sm font-medium rounded-lg
                      transition-colors duration-150
                      ${pathname === item.href
                        ? 'text-teal-700 bg-teal-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                    aria-current={pathname === item.href ? 'page' : undefined}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center space-x-2">
              {/* Desktop user info */}
              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  disabled={isLoading}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <FaChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User dropdown menu - Simplified */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in slide-in-from-top-5">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {user.email}
                      </p>
                    </div>
                    
                    <div className="py-1">
                      {userNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 group transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="mr-3 text-gray-400 group-hover:text-gray-600">
                            {item.icon}
                          </span>
                          {item.name}
                        </Link>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-200 ease-in-out lg:hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div className="pt-4 pb-4 px-4 h-full flex flex-col">
          {/* Mobile menu header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <FaEnvelope className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">MailFlow</h2>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              aria-label="Close menu"
            >
              <FaTimes className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          
          {/* Mobile navigation items */}
          <nav className="space-y-1 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors
                  ${pathname === item.href
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span className={`mr-3 ${pathname === item.href ? 'text-teal-600' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div>{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                </div>
                {pathname === item.href && (
                  <FaChevronRight className="h-3 w-3 text-teal-600" />
                )}
              </Link>
            ))}
          </nav>
          
          {/* Mobile user info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="px-3 mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
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
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
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
              className="w-full mt-3 flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSignOutAlt className="mr-3 h-4 w-4" />
              {isLoading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Page header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {pathname === '/dashboard' && 'Overview and analytics of your email campaigns'}
                  {pathname === '/dashboard/emails' && 'Manage your email accounts and connections'}
                  {pathname === '/dashboard/outbounds' && 'Create and manage your outreach campaigns'}
                  {pathname === '/dashboard/settings' && 'Manage your account settings'}
                  {pathname === '/dashboard/scrape-emails' && 'Find and scrape email addresses for your campaigns'}
                  {pathname === '/dashboard/utils' && 'Tools and utilities to enhance your workflow'}
                  {pathname === '/dashboard/utils/dedupe' && 'Remove duplicates and normalize lists'}
                  {pathname === '/dashboard/utils/domain-check' && 'Check domain registration status'}
                </p>
              </div>
              
              {/* Breadcrumb */}
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 text-sm">
                  <li className="inline-flex items-center">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <FaHome className="mr-1.5 h-3.5 w-3.5" />
                      Home
                    </Link>
                  </li>
                  {pathname !== '/dashboard' && (
                    <>
                      {(pathname === '/dashboard/utils/dedupe' || pathname === '/dashboard/utils/domain-check') && (
                        <li>
                          <div className="flex items-center">
                            <FaChevronRight className="h-3 w-3 text-gray-400 mx-1" />
                            <Link
                              href="/dashboard/utils"
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Utils
                            </Link>
                          </div>
                        </li>
                      )}
                      <li>
                        <div className="flex items-center">
                          <FaChevronRight className="h-3 w-3 text-gray-400 mx-1" />
                          <span className="text-gray-800 font-medium">
                            {getPageTitle()}
                          </span>
                        </div>
                      </li>
                    </>
                  )}
                </ol>
              </nav>
            </div>
          </div>

          {/* Page content */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              MailFlow • {new Date().getFullYear()} • Professional Email Automation
            </p>
            <div className="mt-2">
              <Link 
                href="/dashboard/settings" 
                className="text-xs text-teal-600 hover:text-teal-700 hover:underline"
              >
                Need help? Contact support
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}