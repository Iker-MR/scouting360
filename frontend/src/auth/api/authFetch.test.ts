import { http, HttpResponse, delay } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { createAuthFetch } from './authFetch'

const OLD_TOKEN = 'old-token'
const NEW_TOKEN = 'new-token'

function setup(overrides: Partial<Parameters<typeof createAuthFetch>[0]> = {}) {
  const onTokenRefreshed = vi.fn()
  const onSessionExpired = vi.fn()
  const authFetch = createAuthFetch({
    getAccessToken: () => OLD_TOKEN,
    onTokenRefreshed,
    onSessionExpired,
    ...overrides,
  })
  return { authFetch, onTokenRefreshed, onSessionExpired }
}

function mockRefresh(handler: Parameters<typeof http.post>[1]) {
  const calls = { count: 0 }
  server.use(
    http.post('/api/auth/token/refresh/', (info) => {
      calls.count += 1
      return handler(info)
    }),
  )
  return calls
}

describe('createAuthFetch', () => {
  it('envía el header Authorization con el access token actual', async () => {
    let received: string | null = null
    server.use(
      http.get('/api/players/', ({ request }) => {
        received = request.headers.get('Authorization')
        return HttpResponse.json([])
      }),
    )
    const { authFetch } = setup()

    const response = await authFetch('/api/players/')

    expect(response.status).toBe(200)
    expect(received).toBe(`Bearer ${OLD_TOKEN}`)
  })

  it('conserva los headers del llamador', async () => {
    let received: Headers | null = null
    server.use(
      http.post('/api/players/', ({ request }) => {
        received = request.headers
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { authFetch } = setup()

    await authFetch('/api/players/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'abc' },
      body: JSON.stringify({ name: 'x' }),
    })

    expect(received!.get('Content-Type')).toBe('application/json')
    expect(received!.get('X-Custom')).toBe('abc')
    expect(received!.get('Authorization')).toBe(`Bearer ${OLD_TOKEN}`)
  })

  it('ante un 401 refresca el token y reintenta una sola vez con el token nuevo', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('/api/players/', ({ request }) => {
        const auth = request.headers.get('Authorization')
        seen.push(auth)
        return auth === `Bearer ${NEW_TOKEN}`
          ? HttpResponse.json([{ id: 1 }])
          : HttpResponse.json({ detail: 'expired' }, { status: 401 })
      }),
    )
    const refreshCalls = mockRefresh(() => HttpResponse.json({ access: NEW_TOKEN }))
    const { authFetch, onTokenRefreshed, onSessionExpired } = setup()

    const response = await authFetch('/api/players/')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: 1 }])
    expect(seen).toEqual([`Bearer ${OLD_TOKEN}`, `Bearer ${NEW_TOKEN}`])
    expect(refreshCalls.count).toBe(1)
    expect(onTokenRefreshed).toHaveBeenCalledExactlyOnceWith(NEW_TOKEN)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('no reintenta más de una vez si el reintento también devuelve 401', async () => {
    let protectedCalls = 0
    server.use(
      http.get('/api/players/', () => {
        protectedCalls += 1
        return HttpResponse.json({ detail: 'nope' }, { status: 401 })
      }),
    )
    mockRefresh(() => HttpResponse.json({ access: NEW_TOKEN }))
    const { authFetch } = setup()

    const response = await authFetch('/api/players/')

    expect(response.status).toBe(401)
    expect(protectedCalls).toBe(2)
  })

  it('si el refresh falla notifica sesión expirada y devuelve el 401 original', async () => {
    let protectedCalls = 0
    server.use(
      http.get('/api/players/', () => {
        protectedCalls += 1
        return HttpResponse.json({ detail: 'expired' }, { status: 401 })
      }),
    )
    mockRefresh(() => HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }))
    const { authFetch, onTokenRefreshed, onSessionExpired } = setup()

    const response = await authFetch('/api/players/')

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ detail: 'expired' })
    expect(protectedCalls).toBe(1)
    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(onTokenRefreshed).not.toHaveBeenCalled()
  })

  it('si el refresh lanza un error notifica sesión expirada y devuelve el 401 original', async () => {
    server.use(
      http.get('/api/players/', () =>
        HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
    )
    mockRefresh(() => HttpResponse.json({}, { status: 500 }))
    const { authFetch, onSessionExpired } = setup()

    const response = await authFetch('/api/players/')

    expect(response.status).toBe(401)
    expect(onSessionExpired).toHaveBeenCalledOnce()
  })

  it('varios 401 simultáneos disparan un solo refresh', async () => {
    server.use(
      http.get('/api/players/', ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${NEW_TOKEN}`
          ? HttpResponse.json([])
          : HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
    )
    const refreshCalls = mockRefresh(async () => {
      await delay(20)
      return HttpResponse.json({ access: NEW_TOKEN })
    })
    const { authFetch } = setup()

    const responses = await Promise.all([
      authFetch('/api/players/'),
      authFetch('/api/players/'),
      authFetch('/api/players/'),
    ])

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshCalls.count).toBe(1)
  })

  it('no toca respuestas que no son 401', async () => {
    server.use(
      http.get('/api/forbidden/', () => HttpResponse.json({ detail: 'no' }, { status: 403 })),
      http.get('/api/broken/', () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const refreshCalls = mockRefresh(() => HttpResponse.json({ access: NEW_TOKEN }))
    const { authFetch, onTokenRefreshed, onSessionExpired } = setup()

    const forbidden = await authFetch('/api/forbidden/')
    const broken = await authFetch('/api/broken/')

    expect(forbidden.status).toBe(403)
    expect(broken.status).toBe(500)
    expect(refreshCalls.count).toBe(0)
    expect(onTokenRefreshed).not.toHaveBeenCalled()
    expect(onSessionExpired).not.toHaveBeenCalled()
  })
})
