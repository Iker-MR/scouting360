import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe, mockPendingMe } from '../test/authMocks'
import { buildJugador, mockJugador, mockJugadores, pageResponse } from '../test/jugadoresMocks'
import { server } from '../test/server'

function mockRefresh(valid: boolean) {
  server.use(
    http.post('/api/auth/token/refresh/', () =>
      valid
        ? HttpResponse.json({ access: 'token' })
        : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
    ),
  )
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

/** Accepts the POST and returns scout 9 built from the body. Returns every POST body. */
function mockCreatableOjeador() {
  const posts: unknown[] = []
  server.use(
    http.post('/api/ojeadores/', async ({ request }) => {
      const body = (await request.json()) as Record<string, string>
      posts.push(body)
      return HttpResponse.json({ id: 9, ...body, verificado: false }, { status: 201 })
    }),
  )
  return posts
}

beforeEach(() => {
  mockRefresh(true)
  mockJugadores(() => pageResponse([buildJugador({ nombre: 'Ana Ruiz' })]))
})

describe('OjeadorCreatePage acceso', () => {
  it('muestra cargando mientras no se sabe quién es el usuario', async () => {
    const release = mockPendingMe()
    renderAt('/ojeadores/nuevo')

    // The session is known, but /me has not answered yet.
    await screen.findByRole('button', { name: 'Cerrar sesión' })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()

    release()

    expect(await screen.findByLabelText('Nombre')).toHaveValue('')
  })

  it('redirige al login a un visitante anónimo', async () => {
    mockRefresh(false)
    renderAt('/ojeadores/nuevo')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirige a su perfil a un usuario que ya es jugador', async () => {
    mockMe({ jugador_id: 41 })
    mockJugador(41, () => HttpResponse.json(buildJugador({ id: 41, nombre: 'Luis Gil' })))
    renderAt('/ojeadores/nuevo')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Luis Gil' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Organización')).not.toBeInTheDocument()
  })

  it('redirige al listado a un usuario que ya es ojeador', async () => {
    mockMe({ ojeador_id: 9 })
    renderAt('/ojeadores/nuevo')

    expect(await screen.findByRole('heading', { level: 1, name: 'Jugadores' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Organización')).not.toBeInTheDocument()
  })
})

describe('OjeadorCreatePage creación', () => {
  beforeEach(() => mockMe())

  it('crea el perfil, vuelve al listado y el usuario pasa a ser ojeador', async () => {
    const posts = mockCreatableOjeador()
    const user = userEvent.setup()
    renderAt('/ojeadores/nuevo')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crear perfil de ojeador' }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nombre'), 'Ana Ruiz')
    await user.type(screen.getByLabelText('Organización'), 'CD Ejemplo')
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Jugadores' })).toBeInTheDocument()
    // The header knows the new role without refetching /me.
    expect(screen.getByText('Ojeador')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Soy ojeador' })).not.toBeInTheDocument()
    expect(posts).toEqual([{ nombre: 'Ana Ruiz', organizacion: 'CD Ejemplo' }])
  })

  it('muestra los errores de validación del servidor', async () => {
    server.use(
      http.post('/api/ojeadores/', () =>
        HttpResponse.json(
          { organizacion: ['Asegúrese de que este campo no tenga más de 100 caracteres.'] },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderAt('/ojeadores/nuevo')

    await user.type(await screen.findByLabelText('Nombre'), 'Ana Ruiz')
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Organización')).toHaveAccessibleDescription(
        'Asegúrese de que este campo no tenga más de 100 caracteres.',
      ),
    )
    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeEnabled()
  })

  it('muestra un error si no se puede crear el perfil', async () => {
    server.use(
      http.post('/api/ojeadores/', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/ojeadores/nuevo')

    await user.type(await screen.findByLabelText('Nombre'), 'Ana Ruiz')
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el perfil.')
    // What the user typed survives the failure.
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Ruiz')
    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeEnabled()
  })
})
