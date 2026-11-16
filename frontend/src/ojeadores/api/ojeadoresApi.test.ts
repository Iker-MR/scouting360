import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { buildOjeador } from '../../test/ojeadoresMocks'
import { createOjeador, getOjeador, OjeadorNotFoundError, OjeadorValidationError } from './ojeadoresApi'

// The real fetch is enough here: auth headers and refresh are authFetch's job,
// already covered by its own tests.
const fetcher = (url: string, init?: RequestInit) => fetch(url, init)

const DATOS_NUEVO = { nombre: 'Ana Ruiz', organizacion: 'CD Ejemplo' }

describe('createOjeador', () => {
  it('crea el ojeador con un POST y devuelve el ojeador creado', async () => {
    const creado = { id: 9, ...DATOS_NUEVO, verificado: false }
    let received: { method: string; contentType: string | null; body: unknown } | null = null
    server.use(
      http.post('/api/ojeadores/', async ({ request }) => {
        received = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        }
        return HttpResponse.json(creado, { status: 201 })
      }),
    )

    const result = await createOjeador(fetcher, DATOS_NUEVO)

    expect(result).toEqual(creado)
    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: DATOS_NUEVO,
    })
  })

  it('lanza un error de validación con los errores por campo si el servidor responde 400', async () => {
    server.use(
      http.post('/api/ojeadores/', () =>
        HttpResponse.json({ usuario: ['Este usuario ya tiene otro rol.'] }, { status: 400 }),
      ),
    )

    const error = await createOjeador(fetcher, DATOS_NUEVO).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(OjeadorValidationError)
    expect((error as OjeadorValidationError).fieldErrors).toEqual({
      usuario: ['Este usuario ya tiene otro rol.'],
    })
  })

  it.each([401, 500])('lanza un error genérico si el servidor responde %i', async (status) => {
    server.use(
      http.post('/api/ojeadores/', () => HttpResponse.json({ detail: 'Error' }, { status })),
    )

    const error = await createOjeador(fetcher, DATOS_NUEVO).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(OjeadorValidationError)
  })
})

describe('getOjeador', () => {
  it('pide el ojeador con un GET y lo devuelve', async () => {
    const ojeador = buildOjeador({ id: 9, verificado: true })
    let method: string | null = null
    server.use(
      http.get('/api/ojeadores/9/', ({ request }) => {
        method = request.method
        return HttpResponse.json(ojeador)
      }),
    )

    const result = await getOjeador(fetcher, 9)

    expect(result).toEqual(ojeador)
    expect(method).toBe('GET')
  })

  it('lanza OjeadorNotFoundError si el servidor responde 404', async () => {
    server.use(
      http.get('/api/ojeadores/9/', () =>
        HttpResponse.json({ detail: 'No encontrado.' }, { status: 404 }),
      ),
    )

    const error = await getOjeador(fetcher, 9).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(OjeadorNotFoundError)
  })

  it('lanza un error genérico si el servidor responde 500', async () => {
    server.use(
      http.get('/api/ojeadores/9/', () => HttpResponse.json({ detail: 'Error' }, { status: 500 })),
    )

    const error = await getOjeador(fetcher, 9).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(OjeadorNotFoundError)
  })
})
