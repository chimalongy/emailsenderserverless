'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // Redirect logic for root path
      if (pathname === '/') {
        if (session?.user) {
          router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      }
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && pathname === '/auth/login') {
        router.push('/dashboard')
      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}