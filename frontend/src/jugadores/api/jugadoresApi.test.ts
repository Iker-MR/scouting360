import { http, HttpResponse } from 'msw'
import { buildJugador } from '../../test/jugadoresMocks'
import { server } from '../../test/server'
import { JugadorValidationError, updateJugador } from './jugadoresApi'

// The real fetch is enough here: auth headers and refresh are authFetch's job,
// already covered by its own tests.
const fetcher = (url: string, init?: RequestInit) => fetch(url, init)

describe('updateJugador', () => {
  it('envía un PATCH con los cambios y devuelve el jugador actualizado', async () => {
    const actualizado = buildJugador({ id: 7, nombre: 'Nuevo nombre', zona: 'Sevilla' })
    let received: { method: string; contentType: string | null; body: unknown } | null = null
    server.use(
      http.patch('/api/jugadores/7/', async ({ request }) => {
        received = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        }
        return HttpResponse.json(actualizado)
      }),
    )

    const result = await updateJugador(fetcher, 7, { nombre: 'Nuevo nombre', zona: 'Sevilla' })

    expect(result).toEqual(actualizado)
    expect(received).toEqual({
      method: 'PATCH',
      contentType: 'application/json',
      body: { nombre: 'Nuevo nombre', zona: 'Sevilla' },
    })
  })

  it('lanza un error de validación con los errores por campo si el servidor responde 400', async () => {
    server.use(
      http.patch('/api/jugadores/7/', () =>
        HttpResponse.json(
          { nombre: ['Este campo no puede estar en blanco.'] },
          { status: 400 },
        ),
      ),
    )

    const error = await updateJugador(fetcher, 7, { nombre: '' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(JugadorValidationError)
    expect((error as JugadorValidationError).fieldErrors).toEqual({
      nombre: ['Este campo no puede estar en blanco.'],
    })
  })

  it.each([403, 500])('lanza un error genérico si el servidor responde %i', async (status) => {
    server.use(
      http.patch('/api/jugadores/7/', () =>
        HttpResponse.json({ detail: 'Error' }, { status }),
      ),
    )

    const error = await updateJugador(fetcher, 7, { zona: 'Sevilla' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(JugadorValidationError)
  })
})
