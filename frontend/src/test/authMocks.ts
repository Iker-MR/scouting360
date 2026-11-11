import { http, HttpResponse } from 'msw'
import { server } from './server'

interface MeResponse {
  id: number
  username: string
  jugador_id: number | null
}

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
      return HttpResponse.json({ id: 1, username: 'ojeadora', jugador_id: null, ...me })
    }),
  )
  return authorization
}
