import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as authApi from './api/authApi'
import { createAuthFetch } from './api/authFetch'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<authApi.CurrentUser | null>(null)
  // authFetch reads the token from this ref so it never sees a stale render value.
  const accessTokenRef = useRef<string | null>(null)

  // Single write path: keeps the ref, the token state and the status in sync.
  const setSession = useCallback((token: string | null) => {
    accessTokenRef.current = token
    setAccessToken(token)
    setStatus(token ? 'authenticated' : 'anonymous')
    if (!token) setUser(null)
  }, [])

  // createAuthFetch only stores these callbacks; the ref is read when a request
  // is sent, never during render, so the lint heuristic is a false positive here.
  // oxlint-disable-next-line react/refs
  const [authFetch] = useState(() =>
    createAuthFetch({
      getAccessToken: () => accessTokenRef.current,
      onTokenRefreshed: setSession,
      onSessionExpired: () => setSession(null),
    }),
  )

  useEffect(() => {
    let cancelled = false
    authApi
      .refreshSession()
      .catch(() => null)
      .then((token) => {
        if (!cancelled) setSession(token)
      })
    return () => {
      cancelled = true
    }
  }, [setSession])

  // Keyed on having a session, not on the token: a silent token refresh must
  // not refetch the current user.
  const hasSession = status === 'authenticated'
  useEffect(() => {
    if (!hasSession) return
    let cancelled = false
    authApi
      .getMe(authFetch)
      .catch(() => null)
      .then((me) => {
        if (!cancelled) setUser(me)
      })
    return () => {
      cancelled = true
    }
  }, [hasSession, authFetch])

  const login = useCallback(
    async (username: string, password: string) => {
      setSession(await authApi.login(username, password))
    },
    [setSession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setSession(null)
    }
  }, [setSession])

  const value = useMemo(
    () => ({ status, accessToken, user, login, logout, authFetch }),
    [status, accessToken, user, login, logout, authFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
