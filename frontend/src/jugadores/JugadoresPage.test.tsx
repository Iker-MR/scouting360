import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import { server } from '../test/server'
import { buildJugador, mockJugadores, pageResponse } from '../test/jugadoresMocks'

function mockRefresh(valid: boolean) {
  server.use(
    http.post('/api/auth/token/refresh/', () =>
      valid
        ? HttpResponse.json({ access: 'token' })
        : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
    ),
  )
}

function renderAt(route = '/jugadores') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockRefresh(false)
  mockMe()
})

describe('Listado de jugadores', () => {
  it('pide el listado una sola vez a un visitante anonimo', async () => {
    const requests = mockJugadores(() => pageResponse([buildJugador({ nombre: 'Ana Ruiz' })]))
    renderAt()

    // The auth check finished as anonymous: the header offers to sign in.
    expect(await screen.findByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument()
    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(requests).toHaveLength(1)
  })

  it('muestra los jugadores de la API', async () => {
    mockJugadores(() =>
      pageResponse([
        buildJugador({ nombre: 'Ana Ruiz', posicion_display: 'Delantero centro', zona: 'Sevilla' }),
        buildJugador({ nombre: 'Luis Gil' }),
      ]),
    )
    renderAt()

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Luis Gil')).toBeInTheDocument()
    const card = screen.getByText('Ana Ruiz').closest('article')!
    expect(within(card).getByText('Delantero centro')).toBeInTheDocument()
    expect(screen.getByText('Sevilla')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jugadores' })).toBeInTheDocument()
    expect(screen.getByText('2 jugadores')).toBeInTheDocument()
  })

  it('muestra el estado de carga mientras espera la respuesta', async () => {
    mockJugadores(() => pageResponse([buildJugador({ nombre: 'Ana Ruiz' })]))
    renderAt()

    expect(screen.getByText('Cargando jugadores...')).toBeInTheDocument()
    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
  })

  it('muestra "—" cuando no hay overall y "Sin club" cuando no hay club', async () => {
    mockJugadores(() =>
      pageResponse([
        buildJugador({ nombre: 'Sin Datos', overall: null, atributos: null, club_actual: '' }),
      ]),
    )
    renderAt()

    const card = (await screen.findByText('Sin Datos')).closest('article')!
    expect(within(card).getByText('—')).toBeInTheDocument()
    expect(within(card).getByText('Sin club')).toBeInTheDocument()
  })

  it('muestra la insignia de disponibilidad, la foto y las iniciales como alternativa', async () => {
    mockJugadores(() =>
      pageResponse([
        buildJugador({ nombre: 'Ana Ruiz', disponible: true, foto: 'http://localhost/ana.jpg' }),
        buildJugador({ nombre: 'Luis Gil', disponible: false, foto: null }),
      ]),
    )
    renderAt()

    expect(await screen.findByRole('img', { name: 'Ana Ruiz' })).toHaveAttribute(
      'src',
      'http://localhost/ana.jpg',
    )
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
    expect(screen.getByText('LG')).toBeInTheDocument()
  })

  it('es visible sin iniciar sesion y no envia cabecera Authorization', async () => {
    const headers: Array<string | null> = []
    server.use(
      http.get('/api/jugadores/', ({ request }) => {
        headers.push(request.headers.get('Authorization'))
        return pageResponse([buildJugador({ nombre: 'Ana Ruiz' })])
      }),
    )
    renderAt()

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(headers.every((header) => header === null)).toBe(true)
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('es visible con la sesion iniciada', async () => {
    mockRefresh(true)
    mockJugadores(() => pageResponse([buildJugador({ nombre: 'Ana Ruiz' })]))
    renderAt()

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('muestra el estado vacio cuando no hay resultados', async () => {
    mockJugadores(() => pageResponse([]))
    renderAt()

    expect(
      await screen.findByText('No hay jugadores que coincidan con la búsqueda.'),
    ).toBeInTheDocument()
  })

  it('muestra un error y permite reintentar', async () => {
    let fail = true
    mockJugadores(() =>
      fail
        ? HttpResponse.json({ detail: 'boom' }, { status: 500 })
        : pageResponse([buildJugador({ nombre: 'Ana Ruiz' })]),
    )
    const user = userEvent.setup()
    renderAt()

    expect(await screen.findByText('No se pudieron cargar los jugadores.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar los jugadores.')).not.toBeInTheDocument()
  })
})

describe('Filtros y paginacion', () => {
  it('buscar envia el parametro search y vuelve a la pagina 1', async () => {
    const requests = mockJugadores(() =>
      pageResponse([buildJugador()], { count: 60, next: 'x', previous: 'y' }),
    )
    const user = userEvent.setup()
    renderAt('/jugadores?page=2')
    await screen.findByText('Página 2 de 3')

    await user.type(screen.getByLabelText('Buscar'), 'ana')

    await waitFor(() => {
      const last = requests.at(-1)!
      expect(last.searchParams.get('search')).toBe('ana')
      expect(last.searchParams.has('page')).toBe(false)
    })
    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument()
  })

  it('filtrar por posicion envia el parametro posicion y vuelve a la pagina 1', async () => {
    const requests = mockJugadores(() =>
      pageResponse([buildJugador()], { count: 60, next: 'x', previous: 'y' }),
    )
    const user = userEvent.setup()
    renderAt('/jugadores?page=2')
    await screen.findByText('Página 2 de 3')

    await user.selectOptions(screen.getByLabelText('Posición'), 'DL')

    await waitFor(() => {
      const last = requests.at(-1)!
      expect(last.searchParams.get('posicion')).toBe('DL')
      expect(last.searchParams.has('page')).toBe(false)
    })
  })

  it('el select de posicion ofrece "Todas" y las posiciones con su etiqueta', async () => {
    mockJugadores()
    renderAt()

    const select = await screen.findByLabelText('Posición')
    expect(within(select).getByRole('option', { name: 'Todas' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Portero' })).toHaveValue('PO')
    expect(within(select).getByRole('option', { name: 'Delantero centro' })).toHaveValue('DL')
  })

  it('persiste los filtros en la URL: /jugadores?posicion=DL envia posicion=DL', async () => {
    const requests = mockJugadores()
    renderAt('/jugadores?posicion=DL&search=ana')

    await waitFor(() => expect(requests.length).toBeGreaterThan(0))
    expect(requests.at(-1)!.searchParams.get('posicion')).toBe('DL')
    expect(requests.at(-1)!.searchParams.get('search')).toBe('ana')
    expect(screen.getByLabelText('Posición')).toHaveValue('DL')
    expect(screen.getByLabelText('Buscar')).toHaveValue('ana')
  })

  it('la paginacion pide la pagina siguiente y la anterior', async () => {
    const requests = mockJugadores((url) =>
      pageResponse([buildJugador({ nombre: `Pagina ${url.searchParams.get('page') ?? '1'}` })], {
        count: 45,
        next: 'x',
        previous: 'y',
      }),
    )
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Pagina 1')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(await screen.findByText('Pagina 2')).toBeInTheDocument()
    expect(requests.at(-1)!.searchParams.get('page')).toBe('2')
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(await screen.findByText('Pagina 1')).toBeInTheDocument()
  })

  it('deshabilita Anterior en la primera pagina y Siguiente en la ultima', async () => {
    mockJugadores((url) =>
      url.searchParams.get('page') === '2'
        ? pageResponse([buildJugador()], { count: 25, next: null, previous: 'p' })
        : pageResponse([buildJugador()], { count: 25, next: 'n', previous: null }),
    )
    const user = userEvent.setup()
    renderAt()

    await screen.findByText('Página 1 de 2')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await screen.findByText('Página 2 de 2')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  })

  it('las respuestas fuera de orden no pisan los resultados nuevos', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockJugadores(async (url) => {
      if (url.searchParams.get('posicion') === 'DL') {
        return pageResponse([buildJugador({ nombre: 'Resultado Nuevo' })])
      }
      await gate
      return pageResponse([buildJugador({ nombre: 'Resultado Viejo' })])
    })
    const user = userEvent.setup()
    renderAt()

    await user.selectOptions(await screen.findByLabelText('Posición'), 'DL')
    expect(await screen.findByText('Resultado Nuevo')).toBeInTheDocument()

    release()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByText('Resultado Nuevo')).toBeInTheDocument()
    expect(screen.queryByText('Resultado Viejo')).not.toBeInTheDocument()
  })
})

describe('Sesion y listado', () => {
  it('vuelve a pedir el listado de forma anonima cuando se cierra la sesion', async () => {
    mockRefresh(true)
    const auth: Array<string | null> = []
    server.use(
      http.get('/api/jugadores/', ({ request }) => {
        auth.push(request.headers.get('Authorization'))
        return pageResponse([buildJugador({ nombre: 'Ana Ruiz' })])
      }),
      http.post('/api/auth/logout/', () => new HttpResponse(null, { status: 204 })),
    )
    const user = userEvent.setup()
    renderAt()

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    await waitFor(() => expect(auth.at(-1)).toBeNull())
    expect(auth).toContain('Bearer token')
  })
})
