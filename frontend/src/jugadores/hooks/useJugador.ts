import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { getJugador, JugadorNotFoundError, type Jugador } from '../api/jugadoresApi'

type Settled =
  | { key: string; data: Jugador; outcome: 'success' }
  | { key: string; data: null; outcome: 'notFound' | 'error' }

export type UseJugadorResult = { retry: () => void } & (
  | { status: 'loading'; data: null }
  | { status: 'notFound'; data: null }
  | { status: 'error'; data: null }
  | { status: 'success'; data: Jugador }
)

// `id` is null when the route param is not a valid id: no request is made.
export function useJugador(id: number | null): UseJugadorResult {
  const { authFetch, status: authStatus } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // 'checking' and 'anonymous' send the same tokenless request, so only gaining
  // or losing a session should trigger a refetch.
  const hasSession = authStatus === 'authenticated'

  // Identifies one request; a result for any other key is stale.
  const key = JSON.stringify([id, hasSession, attempt])

  useEffect(() => {
    if (id === null) return
    let cancelled = false
    getJugador(authFetch, id).then(
      (data) => {
        if (!cancelled) setSettled({ key, data, outcome: 'success' })
      },
      (error: unknown) => {
        if (cancelled) return
        const outcome = error instanceof JugadorNotFoundError ? 'notFound' : 'error'
        setSettled({ key, data: null, outcome })
      },
    )
    return () => {
      cancelled = true
    }
  }, [authFetch, key, id])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  if (id === null) return { data: null, status: 'notFound', retry }
  if (!settled || settled.key !== key) return { data: null, status: 'loading', retry }
  if (settled.outcome === 'success') return { data: settled.data, status: 'success', retry }
  return { data: null, status: settled.outcome, retry }
}
