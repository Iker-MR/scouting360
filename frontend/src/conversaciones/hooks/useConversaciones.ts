import { useCallback, useEffect, useState } from 'react'
import type { Page } from '../../jugadores/api/jugadoresApi'
import { useAuth } from '../../auth/useAuth'
import { getConversaciones, type ConversacionResumen } from '../api/conversacionesApi'

type Settled =
  | { key: string; data: Page<ConversacionResumen>; outcome: 'success' }
  | { key: string; data: null; outcome: 'error' }

export type UseConversacionesResult = { retry: () => void } & (
  | { status: 'idle'; data: null }
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'success'; data: Page<ConversacionResumen> }
)

/** `enabled` is false without a session: no request is made. */
export function useConversaciones(enabled: boolean): UseConversacionesResult {
  const { authFetch } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // Identifies one request; a result for any other key is stale.
  const key = JSON.stringify([enabled, attempt])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    getConversaciones(authFetch).then(
      (data) => {
        if (!cancelled) setSettled({ key, data, outcome: 'success' })
      },
      () => {
        if (!cancelled) setSettled({ key, data: null, outcome: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [authFetch, key, enabled])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  if (!enabled) return { data: null, status: 'idle', retry }
  if (!settled || settled.key !== key) return { data: null, status: 'loading', retry }
  if (settled.outcome === 'success') return { data: settled.data, status: 'success', retry }
  return { data: null, status: 'error', retry }
}
