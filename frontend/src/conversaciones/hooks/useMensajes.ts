import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { ConversacionNotFoundError, getMensajes, type Mensaje } from '../api/conversacionesApi'

type Settled =
  | { key: string; data: Mensaje[]; outcome: 'success' }
  | { key: string; data: null; outcome: 'notFound' | 'error' }

export type UseMensajesResult = {
  retry: () => void
  /** Appends a message the user just sent, without refetching (no "Cargando..." flash). */
  agregar: (mensaje: Mensaje) => void
} & (
  | { status: 'loading'; data: null }
  | { status: 'notFound'; data: null }
  | { status: 'error'; data: null }
  | { status: 'success'; data: Mensaje[] }
)

/**
 * `conversacionId` is null when there is nothing to fetch (invalid route
 * param, or no session yet): no request is made and the result is 'notFound'.
 */
export function useMensajes(conversacionId: number | null): UseMensajesResult {
  const { authFetch } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  // Identifies one request; a result for any other key is stale.
  const key = JSON.stringify([conversacionId, attempt])

  useEffect(() => {
    if (conversacionId === null) return
    let cancelled = false
    getMensajes(authFetch, conversacionId).then(
      (data) => {
        if (!cancelled) setSettled({ key, data, outcome: 'success' })
      },
      (error: unknown) => {
        if (cancelled) return
        const outcome = error instanceof ConversacionNotFoundError ? 'notFound' : 'error'
        setSettled({ key, data: null, outcome })
      },
    )
    return () => {
      cancelled = true
    }
  }, [authFetch, key, conversacionId])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  const agregar = useCallback((mensaje: Mensaje) => {
    setSettled((current) =>
      current?.outcome === 'success' ? { ...current, data: [...current.data, mensaje] } : current,
    )
  }, [])

  if (conversacionId === null) return { data: null, status: 'notFound', retry, agregar }
  if (!settled || settled.key !== key) return { data: null, status: 'loading', retry, agregar }
  if (settled.outcome === 'success') {
    return { data: settled.data, status: 'success', retry, agregar }
  }
  return { data: null, status: settled.outcome, retry, agregar }
}
