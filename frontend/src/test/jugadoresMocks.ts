import { http, HttpResponse } from 'msw'
import type { Jugador, Page } from '../jugadores/api/jugadoresApi'
import { server } from './server'

let nextId = 1

/**
 * A public profile by default, as most viewers get it: age but no birth date.
 * Owner tests pass `fecha_nacimiento` explicitly.
 */
export function buildJugador(overrides: Partial<Jugador> = {}): Jugador {
  const id = nextId++
  return {
    id,
    nombre: `Jugador ${id}`,
    edad: 20,
    posicion: 'MC',
    posicion_display: 'Mediocentro',
    pierna_dominante: 'D',
    zona: 'Madrid',
    club_actual: 'CD Ejemplo',
    disponible: true,
    foto: null,
    creado: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

export function pageResponse(results: Jugador[], overrides: Partial<Page<Jugador>> = {}) {
  return HttpResponse.json<Page<Jugador>>({
    count: results.length,
    next: null,
    previous: null,
    results,
    ...overrides,
  })
}

// Registers a GET /api/jugadores/ handler and records every requested URL.
export function mockJugadores(
  respond: (url: URL) => Response | Promise<Response> = () => pageResponse([]),
) {
  const requests: URL[] = []
  server.use(
    http.get('/api/jugadores/', ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      return respond(url)
    }),
  )
  return requests
}

// Registers a GET /api/jugadores/:id/ handler and records every requested URL.
export function mockJugador(
  id: number,
  respond: (url: URL) => Response | Promise<Response> = () =>
    HttpResponse.json(buildJugador({ id })),
) {
  const requests: URL[] = []
  server.use(
    http.get(`/api/jugadores/${id}/`, ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      return respond(url)
    }),
  )
  return requests
}
