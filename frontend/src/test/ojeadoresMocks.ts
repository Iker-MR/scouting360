import { http, HttpResponse } from 'msw'
import type { Ojeador } from '../ojeadores/api/ojeadoresApi'
import { server } from './server'

export function buildOjeador(overrides: Partial<Ojeador> = {}): Ojeador {
  return { id: 9, nombre: 'Ana Ruiz', organizacion: 'CD Ejemplo', verificado: false, ...overrides }
}

/** Mocks GET /api/ojeadores/:id/ and returns the URL of every request it receives. */
export function mockOjeador(
  id: number,
  respond: () => Response | Promise<Response> = () => HttpResponse.json(buildOjeador({ id })),
) {
  const requests: URL[] = []
  server.use(
    http.get(`/api/ojeadores/${id}/`, ({ request }) => {
      requests.push(new URL(request.url))
      return respond()
    }),
  )
  return requests
}
