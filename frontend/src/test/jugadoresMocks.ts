import { http, HttpResponse } from 'msw'
import type { Jugador, Page } from '../jugadores/api/jugadoresApi'
import { server } from './server'

let nextId = 1

export function buildJugador(overrides: Partial<Jugador> = {}): Jugador {
  const id = nextId++
  return {
    id,
    usuario: id + 100,
    nombre: `Jugador ${id}`,
    fecha_nacimiento: '2005-04-12',
    posicion: 'MC',
    posicion_display: 'Mediocentro',
    pierna_dominante: 'D',
    zona: 'Madrid',
    club_actual: 'CD Ejemplo',
    disponible: true,
    foto: null,
    bio: '',
    atributos: { ritmo: 70, tiro: 65, pase: 72, regate: 68, defensa: 50, fisico: 60 },
    overall: 70,
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
