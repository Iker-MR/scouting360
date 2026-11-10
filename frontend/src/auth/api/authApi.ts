export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password')
    this.name = 'InvalidCredentialsError'
  }
}

interface TokenResponse {
  access: string
}

function postJson(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function login(username: string, password: string): Promise<string> {
  const response = await postJson('/api/auth/token/', { username, password })
  if (response.status === 401) throw new InvalidCredentialsError()
  if (!response.ok) throw new Error(`Login failed with status ${response.status}`)
  const { access } = (await response.json()) as TokenResponse
  return access
}

let inFlightRefresh: Promise<string | null> | null = null

// Concurrent callers share one request: the backend rotates and blacklists the
// refresh cookie, so a second parallel request with the old cookie would get 401.
export function refreshSession(): Promise<string | null> {
  inFlightRefresh ??= requestRefresh().finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}

async function requestRefresh(): Promise<string | null> {
  const response = await postJson('/api/auth/token/refresh/')
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`Refresh failed with status ${response.status}`)
  const { access } = (await response.json()) as TokenResponse
  return access
}

export async function logout(): Promise<void> {
  const response = await postJson('/api/auth/logout/')
  if (!response.ok) throw new Error(`Logout failed with status ${response.status}`)
}
