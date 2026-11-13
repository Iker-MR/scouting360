import { http, HttpResponse } from 'msw'
import { buildJugador } from '../../test/jugadoresMocks'
import { server } from '../../test/server'
import { createJugador, JugadorValidationError, updateJugador } from './jugadoresApi'

// The real fetch is enough here: auth headers and refresh are authFetch's job,
// already covered by its own tests.
const fetcher = (url: string, init?: RequestInit) => fetch(url, init)

const DATOS_NUEVO = {
  nombre: 'Iker',
  fecha_nacimiento: '2004-05-10',
  posicion: 'MC',
  pierna_dominante: 'D',
  zona: 'Bilbao',
  club_actual: '',
  disponible: true,
  bio: '',
} as const

describe('createJugador', () => {
  it('crea el jugador con un POST y devuelve el jugador creado', async () => {
    const creado = buildJugador({ id: 42, nombre: 'Iker', zona: 'Bilbao' })
    let received: { method: string; contentType: string | null; body: unknown } | null = null
    server.use(
      http.post('/api/jugadores/', async ({ request }) => {
        received = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        }
        return HttpResponse.json(creado, { status: 201 })
      }),
    )

    const result = await createJugador(fetcher, DATOS_NUEVO)

    expect(result).toEqual(creado)
    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: DATOS_NUEVO,
    })
  })

  it('lanza un error de validación con los errores por campo si el servidor responde 400', async () => {
    server.use(
      http.post('/api/jugadores/', () =>
        HttpResponse.json({ posicion: ['"" no es una elección válida.'] }, { status: 400 }),
      ),
    )

    const error = await createJugador(fetcher, DATOS_NUEVO).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(JugadorValidationError)
    expect((error as JugadorValidationError).fieldErrors).toEqual({
      posicion: ['"" no es una elección válida.'],
    })
  })

  it.each([401, 500])('lanza un error genérico si el servidor responde %i', async (status) => {
    server.use(
      http.post('/api/jugadores/', () => HttpResponse.json({ detail: 'Error' }, { status })),
    )

    const error = await createJugador(fetcher, DATOS_NUEVO).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(JugadorValidationError)
  })
})

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
