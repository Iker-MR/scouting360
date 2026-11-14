import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Link, MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import { server } from '../test/server'
import { buildJugador, mockJugador, mockJugadores, pageResponse } from '../test/jugadoresMocks'

function mockRefresh(valid: boolean) {
  server.use(
    http.post('/api/auth/token/refresh/', () =>
      valid
        ? HttpResponse.json({ access: 'token' })
        : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
    ),
  )
}

function renderAt(route: string, extra?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      {extra}
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockRefresh(false)
  // Default current user; tests that care about ownership override it.
  mockMe()
})

describe('Detalle de jugador', () => {
  it('muestra los datos del jugador', async () => {
    mockJugador(7, () =>
      HttpResponse.json(
        buildJugador({
          id: 7,
          nombre: 'Ana Ruiz',
          posicion_display: 'Delantero centro',
          pierna_dominante: 'I',
          zona: 'Sevilla',
          club_actual: 'Betis B',
          disponible: true,
          foto: 'http://localhost/ana.jpg',
          bio: 'Delantera rápida.',
        }),
      ),
    )
    renderAt('/jugadores/7')

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ana Ruiz' })).toHaveAttribute(
      'src',
      'http://localhost/ana.jpg',
    )
    expect(screen.getByText('Delantero centro')).toBeInTheDocument()
    expect(screen.getByText(/\d+ años/)).toBeInTheDocument()
    expect(screen.getByText('Zurda')).toBeInTheDocument()
    expect(screen.getByText('Sevilla')).toBeInTheDocument()
    expect(screen.getByText('Betis B')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Delantera rápida.')).toBeInTheDocument()
  })

  it('muestra las iniciales, "Sin club", "No disponible" y "Derecha" cuando faltan datos', async () => {
    mockJugador(3, () =>
      HttpResponse.json(
        buildJugador({
          id: 3,
          nombre: 'Luis Gil',
          foto: null,
          club_actual: '',
          disponible: false,
          pierna_dominante: 'D',
        }),
      ),
    )
    renderAt('/jugadores/3')

    await screen.findByRole('heading', { level: 1, name: 'Luis Gil' })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('LG')).toBeInTheDocument()
    expect(screen.getByText('Sin club')).toBeInTheDocument()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
    expect(screen.getByText('Derecha')).toBeInTheDocument()
  })

  it('calcula la edad a partir de la fecha de nacimiento', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 3, 11) })
    try {
      mockJugador(4, () =>
        HttpResponse.json(buildJugador({ id: 4, fecha_nacimiento: '2005-04-12' })),
      )
      renderAt('/jugadores/4')

      // The day before the 21st birthday: still 20.
      expect(await screen.findByText('20 años')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('muestra solo datos descriptivos, sin atributos ni valoración global', async () => {
    // Even if a stale API still sent the old ratings, the page must not show them.
    const conValoraciones = {
      ...buildJugador({ id: 9 }),
      overall: 87,
      atributos: { ritmo: 91, tiro: 82, pase: 73, regate: 64, defensa: 55, fisico: 46 },
    }
    mockJugador(9, () => HttpResponse.json(conValoraciones))
    renderAt('/jugadores/9')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Atributos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.queryByText('Overall')).not.toBeInTheDocument()
    expect(screen.queryByText('87')).not.toBeInTheDocument()
  })

  it('sin bio no muestra la sección', async () => {
    mockJugador(8, () => HttpResponse.json(buildJugador({ id: 8, bio: '' })))
    renderAt('/jugadores/8')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Biografía' })).not.toBeInTheDocument()
  })

  it('con bio muestra la sección de biografía', async () => {
    mockJugador(9, () => HttpResponse.json(buildJugador({ id: 9, bio: 'Un texto.' })))
    renderAt('/jugadores/9')

    expect(await screen.findByRole('heading', { name: 'Biografía' })).toBeInTheDocument()
  })

  it('muestra el estado de carga mientras espera la respuesta', async () => {
    mockJugador(10, () => HttpResponse.json(buildJugador({ id: 10, nombre: 'Ana Ruiz' })))
    renderAt('/jugadores/10')

    expect(screen.getByText('Cargando jugador...')).toBeInTheDocument()
    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
  })

  it('404 muestra "Jugador no encontrado." con un enlace al listado', async () => {
    mockJugador(404, () => HttpResponse.json({ detail: 'No encontrado.' }, { status: 404 }))
    renderAt('/jugadores/404')

    expect(await screen.findByText('Jugador no encontrado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al listado' })).toHaveAttribute(
      'href',
      '/jugadores',
    )
  })

  it('un id no numérico no llama a la API', async () => {
    let calls = 0
    server.use(
      http.get('/api/jugadores/:id/', () => {
        calls += 1
        return HttpResponse.json(buildJugador())
      }),
    )
    renderAt('/jugadores/abc')

    expect(await screen.findByText('Jugador no encontrado.')).toBeInTheDocument()
    // Let the auth check settle so a late request would have shown up.
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('un error muestra el mensaje y permite reintentar', async () => {
    let fail = true
    mockJugador(11, () =>
      fail
        ? HttpResponse.json({ detail: 'boom' }, { status: 500 })
        : HttpResponse.json(buildJugador({ id: 11, nombre: 'Ana Ruiz' })),
    )
    const user = userEvent.setup()
    renderAt('/jugadores/11')

    expect(await screen.findByText('No se pudo cargar el jugador.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo cargar el jugador.')).not.toBeInTheDocument()
  })

  it('pide el detalle una sola vez a un visitante anónimo', async () => {
    const requests = mockJugador(12, () =>
      HttpResponse.json(buildJugador({ id: 12, nombre: 'Ana Ruiz' })),
    )
    renderAt('/jugadores/12')

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    // The auth check finished as anonymous.
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(1)
  })

  it('vuelve a pedir el detalle con credenciales cuando se gana la sesión', async () => {
    mockRefresh(true)
    const auth: Array<string | null> = []
    server.use(
      http.get('/api/jugadores/13/', ({ request }) => {
        auth.push(request.headers.get('Authorization'))
        return HttpResponse.json(buildJugador({ id: 13, nombre: 'Ana Ruiz' }))
      }),
    )
    renderAt('/jugadores/13')

    // Wait for the final state first: the anonymous render of "Ana Ruiz" is
    // unmounted when the session arrives and the detail is refetched, so
    // asserting on it races with that refetch.
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    await waitFor(() => expect(auth.at(-1)).toBe('Bearer token'))
    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
  })

  it('las respuestas fuera de orden no muestran el jugador equivocado', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockJugador(21, async () => {
      await gate
      return HttpResponse.json(buildJugador({ id: 21, nombre: 'Jugador Viejo' }))
    })
    mockJugador(22, () => HttpResponse.json(buildJugador({ id: 22, nombre: 'Jugador Nuevo' })))
    const user = userEvent.setup()
    renderAt('/jugadores/21', <Link to="/jugadores/22">ir al 22</Link>)

    await user.click(await screen.findByRole('link', { name: 'ir al 22' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jugador Nuevo' }),
    ).toBeInTheDocument()

    release()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByRole('heading', { level: 1, name: 'Jugador Nuevo' })).toBeInTheDocument()
    expect(screen.queryByText('Jugador Viejo')).not.toBeInTheDocument()
  })
})

describe('Editar perfil propio', () => {
  it('muestra "Editar perfil" en el perfil propio', async () => {
    mockRefresh(true)
    mockMe({ jugador_id: 41 })
    mockJugador(41, () => HttpResponse.json(buildJugador({ id: 41, nombre: 'Ana Ruiz' })))
    renderAt('/jugadores/41')

    expect(await screen.findByRole('link', { name: 'Editar perfil' })).toHaveAttribute(
      'href',
      '/jugadores/41/editar',
    )
  })

  it('no muestra "Editar perfil" en el perfil de otro jugador', async () => {
    mockRefresh(true)
    const meRequests = mockMe({ jugador_id: 99 })
    mockJugador(42, () => HttpResponse.json(buildJugador({ id: 42, nombre: 'Ana Ruiz' })))
    renderAt('/jugadores/42')

    await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })
    // Wait until the current user is known: otherwise the button would be
    // missing just because /me/ has not answered yet.
    await waitFor(() => expect(meRequests).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('link', { name: 'Editar perfil' })).not.toBeInTheDocument()
  })

  it('no muestra "Editar perfil" a un visitante anónimo', async () => {
    mockJugador(43, () => HttpResponse.json(buildJugador({ id: 43, nombre: 'Ana Ruiz' })))
    renderAt('/jugadores/43')

    await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar perfil' })).not.toBeInTheDocument()
  })
})

describe('Navegación entre listado y detalle', () => {
  it('clic en la tarjeta navega al detalle', async () => {
    mockJugadores(() => pageResponse([buildJugador({ id: 31, nombre: 'Ana Ruiz' })]))
    mockJugador(31, () =>
      HttpResponse.json(buildJugador({ id: 31, nombre: 'Ana Ruiz', bio: 'Bio de Ana.' })),
    )
    const user = userEvent.setup()
    renderAt('/jugadores')

    const card = (await screen.findByText('Ana Ruiz')).closest('article')!
    await user.click(within(card).getByRole('link', { name: 'Ana Ruiz' }))

    expect(await screen.findByText('Bio de Ana.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Ruiz' })).toBeInTheDocument()
  })

  it('"Volver al listado" conserva los filtros', async () => {
    const requests = mockJugadores(() =>
      pageResponse([buildJugador({ id: 32, nombre: 'Ana Ruiz' })]),
    )
    mockJugador(32, () => HttpResponse.json(buildJugador({ id: 32, nombre: 'Ana Ruiz' })))
    const user = userEvent.setup()
    renderAt('/jugadores?posicion=DL&search=ana')

    const card = (await screen.findByText('Ana Ruiz')).closest('article')!
    await user.click(within(card).getByRole('link', { name: 'Ana Ruiz' }))
    await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })
    const before = requests.length

    await user.click(screen.getByRole('link', { name: 'Volver al listado' }))

    expect(await screen.findByRole('heading', { name: 'Jugadores' })).toBeInTheDocument()
    expect(screen.getByLabelText('Posición')).toHaveValue('DL')
    expect(screen.getByLabelText('Buscar')).toHaveValue('ana')
    await waitFor(() => expect(requests.length).toBeGreaterThan(before))
    expect(requests.at(-1)!.searchParams.get('posicion')).toBe('DL')
    expect(requests.at(-1)!.searchParams.get('search')).toBe('ana')
  })

  it('"Volver al listado" lleva a /jugadores si se entra directamente al detalle', async () => {
    mockJugador(33, () => HttpResponse.json(buildJugador({ id: 33 })))
    renderAt('/jugadores/33')

    expect(await screen.findByRole('link', { name: 'Volver al listado' })).toHaveAttribute(
      'href',
      '/jugadores',
    )
  })
})
