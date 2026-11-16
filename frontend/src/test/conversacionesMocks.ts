import { http, HttpResponse } from 'msw'
import type { Mensaje } from '../conversaciones/api/conversacionesApi'
import { server } from './server'

export function buildMensaje(overrides: Partial<Mensaje> = {}): Mensaje {
  return {
    id: 1,
    autor: 'ojeador',
    texto: 'Hola, te vi jugar el domingo.',
    enviado: '2026-11-16T10:00:00Z',
    ...overrides,
  }
}

/** Mocks GET /api/conversaciones/:id/mensajes/ and returns the URL of every request it receives. */
export function mockMensajes(
  id: number,
  respond: () => Response | Promise<Response> = () => HttpResponse.json([buildMensaje()]),
) {
  const requests: URL[] = []
  server.use(
    http.get(`/api/conversaciones/${id}/mensajes/`, ({ request }) => {
      requests.push(new URL(request.url))
      return respond()
    }),
  )
  return requests
}

/** Mocks POST /api/conversaciones/:id/mensajes/ and returns the JSON body of every request. */
export function mockEnviarMensaje(
  id: number,
  respond: (body: { texto: string }) => Response | Promise<Response>,
) {
  const bodies: Array<{ texto: string }> = []
  server.use(
    http.post(`/api/conversaciones/${id}/mensajes/`, async ({ request }) => {
      const body = (await request.json()) as { texto: string }
      bodies.push(body)
      return respond(body)
    }),
  )
  return bodies
}

/** Mocks POST /api/conversaciones/ and returns the JSON body of every request. */
export function mockIniciarConversacion(
  respond: (body: { jugador: number; texto: string }) => Response | Promise<Response>,
) {
  const bodies: Array<{ jugador: number; texto: string }> = []
  server.use(
    http.post('/api/conversaciones/', async ({ request }) => {
      const body = (await request.json()) as { jugador: number; texto: string }
      bodies.push(body)
      return respond(body)
    }),
  )
  return bodies
}
