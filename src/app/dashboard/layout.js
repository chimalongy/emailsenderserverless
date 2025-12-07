'use client'

import { useEffect } from 'react'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

 // Remove this useEffect - let AuthProvider handle redirects
  // useEffect(() => {
  //   if (!user) {
  //     router.push('/auth/login')
  //   }
  // }, [user, router])

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
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  📧 Email Automation
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {tabs.map((tab) => (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
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
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}