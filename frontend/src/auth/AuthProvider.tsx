import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from './api/authApi'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    authApi
      .refreshSession()
      .catch(() => null)
      .then((token) => {
        if (cancelled) return
        setAccessToken(token)
        setStatus(token ? 'authenticated' : 'anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const token = await authApi.login(username, password)
    setAccessToken(token)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo(
    () => ({ status, accessToken, login, logout }),
    [status, accessToken, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
