import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { getOjeador, OjeadorNotFoundError, type Ojeador } from '../api/ojeadoresApi'

type Settled =
  | { key: string; data: Ojeador; outcome: 'success' }
  | { key: string; data: null; outcome: 'notFound' | 'error' }

export type UseOjeadorResult = { retry: () => void } & (
  | { status: 'loading'; data: null }
  | { status: 'notFound'; data: null }
  | { status: 'error'; data: null }
  | { status: 'success'; data: Ojeador }
)

/**
 * `id` is null when there is nothing to fetch (invalid route param, or no
 * session yet): no request is made and the result is 'notFound'.
 */
export function useOjeador(id: number | null): UseOjeadorResult {
  const { authFetch } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // Identifies one request; a result for any other key is stale.
  const key = JSON.stringify([id, attempt])

  useEffect(() => {
    if (id === null) return
    let cancelled = false
    getOjeador(authFetch, id).then(
      (data) => {
        if (!cancelled) setSettled({ key, data, outcome: 'success' })
      },
      (error: unknown) => {
        if (cancelled) return
        const outcome = error instanceof OjeadorNotFoundError ? 'notFound' : 'error'
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
