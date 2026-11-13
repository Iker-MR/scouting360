import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as authApi from './api/authApi'
import { createAuthFetch } from './api/authFetch'
import { AuthContext, type AuthStatus, type UserStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<authApi.CurrentUser | null>(null)
  // Whether GET /api/auth/me/ has answered (or failed) for the current session.
  const [meSettled, setMeSettled] = useState(false)
  // authFetch reads the token from this ref so it never sees a stale render value.
  const accessTokenRef = useRef<string | null>(null)

  // Single write path: keeps the ref, the token state and the status in sync.
  const setSession = useCallback((token: string | null) => {
    accessTokenRef.current = token
    setAccessToken(token)
    setStatus(token ? 'authenticated' : 'anonymous')
    // Only a lost session resets the user: a silent token refresh keeps it.
    if (!token) {
      setUser(null)
      setMeSettled(false)
    }
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
        if (cancelled) return
        setUser(me)
        setMeSettled(true)
      })
    return () => {
      cancelled = true
    }
  }, [hasSession, authFetch])

  // Derived, not stored, so it can never disagree with `status`.
  const userStatus: UserStatus = status === 'checking' || (hasSession && !meSettled) ? 'loading' : 'ready'

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

  // The create response is as authoritative as /me, so no refetch (and no
  // 'loading' flicker). Without a loaded user there is nothing to link.
  const linkJugador = useCallback((jugadorId: number) => {
    setUser((current) => (current ? { ...current, jugador_id: jugadorId } : current))
  }, [])

  const value = useMemo(
    () => ({ status, accessToken, user, userStatus, login, logout, linkJugador, authFetch }),
    [status, accessToken, user, userStatus, login, logout, linkJugador, authFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
