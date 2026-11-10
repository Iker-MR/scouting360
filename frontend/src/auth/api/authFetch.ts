import { refreshSession } from './authApi'

export interface AuthFetchOptions {
  getAccessToken: () => string | null
  onTokenRefreshed: (token: string) => void
  onSessionExpired: () => void
  refresh?: () => Promise<string | null>
}

export type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>

// Note: a ReadableStream body can be consumed only once, so it cannot be
// replayed on the retry after a refresh. Use string/Blob/FormData bodies.
export function createAuthFetch({
  getAccessToken,
  onTokenRefreshed,
  onSessionExpired,
  refresh = refreshSession,
}: AuthFetchOptions): AuthFetch {
  function send(url: string, init: RequestInit | undefined, token: string | null) {
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...init, headers, credentials: 'same-origin' })
  }

  return async function authFetch(url, init) {
    const response = await send(url, init, getAccessToken())
    if (response.status !== 401) return response

    let newToken: string | null
    try {
      newToken = await refresh()
    } catch {
      newToken = null
    }
    if (!newToken) {
      onSessionExpired()
      return response
    }
    onTokenRefreshed(newToken)
    return send(url, init, newToken)
  }
}
