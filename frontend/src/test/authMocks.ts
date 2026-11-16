import { http, HttpResponse } from 'msw'
import { server } from './server'

interface MeResponse {
  id: number
  username: string
  jugador_id: number | null
  ojeador_id: number | null
}

const DEFAULT_ME: MeResponse = { id: 1, username: 'ojeadora', jugador_id: null, ojeador_id: null }

/**
 * Mocks GET /api/auth/me/ and returns the Authorization header of every
 * request it receives, so tests can assert how many calls were made and
 * whether they carried the access token.
 */
export function mockMe(me: Partial<MeResponse> = {}) {
  const authorization: Array<string | null> = []
  server.use(
    http.get('/api/auth/me/', ({ request }) => {
      authorization.push(request.headers.get('Authorization'))
      return HttpResponse.json({ ...DEFAULT_ME, ...me })
    }),
  )
  return authorization
}

/** Holds GET /api/auth/me/ until the returned release() is called. */
export function mockPendingMe(me: Partial<MeResponse> = {}) {
  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get('/api/auth/me/', async () => {
      await released
      return HttpResponse.json({ ...DEFAULT_ME, ...me })
    }),
  )
  return release
}
