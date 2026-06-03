'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
    let mounted = true;
    
    const getSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setUser(data.user);
          }
        } else {
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getSession();

    return () => {
      mounted = false;
    }
  }, []); // Only fetch session once on mount

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (pathname === '/') {
        if (user) {
          router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      } else if (!user && pathname.startsWith('/dashboard')) {
        router.push('/auth/login')
      } else if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
        router.push('/dashboard')
      }
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}