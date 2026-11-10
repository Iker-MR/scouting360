import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { listJugadores, type Jugador, type JugadoresQuery, type Page } from '../api/jugadoresApi'

type Settled =
  | { key: string; data: Page<Jugador>; failed: false }
  | { key: string; data: null; failed: true }

export type UseJugadoresResult = { retry: () => void } & (
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'success'; data: Page<Jugador> }
)

export function useJugadores({ page, search, posicion }: JugadoresQuery): UseJugadoresResult {
  const { authFetch, status: authStatus } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // 'checking' and 'anonymous' send the same tokenless request, so only gaining
  // or losing a session should trigger a refetch.
  const hasSession = authStatus === 'authenticated'

  // Identifies one request. Any change (filters, page, session, retry) makes
  // the previous result stale, so it is never shown for the new request.
  const key = JSON.stringify([page, search, posicion, hasSession, attempt])

  useEffect(() => {
    let cancelled = false
    listJugadores(authFetch, { page, search, posicion }).then(
      (data) => {
        if (!cancelled) setSettled({ key, data, failed: false })
      },
      () => {
        if (!cancelled) setSettled({ key, data: null, failed: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [authFetch, key, page, search, posicion])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  if (!settled || settled.key !== key) return { data: null, status: 'loading', retry }
  if (settled.failed) return { data: null, status: 'error', retry }
  return { data: settled.data, status: 'success', retry }
}
