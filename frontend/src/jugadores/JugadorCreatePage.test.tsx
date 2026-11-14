import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe, mockPendingMe } from '../test/authMocks'
import { buildJugador, mockJugador } from '../test/jugadoresMocks'
import { server } from '../test/server'
import type { Jugador } from './api/jugadoresApi'

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

/**
 * In-memory backend: POST creates player 42 from the body and GET returns it,
 * so the detail page shows what was created. Returns the body of every POST.
 */
function mockCreatableJugador() {
  let jugador: Jugador | null = null
  const posts: unknown[] = []
  server.use(
    http.post('/api/jugadores/', async ({ request }) => {
      const body = (await request.json()) as Partial<Jugador>
      posts.push(body)
      jugador = buildJugador({ ...body, id: 42 })
      return HttpResponse.json(jugador, { status: 201 })
    }),
  )
  mockJugador(42, () =>
    jugador ? HttpResponse.json(jugador) : HttpResponse.json({ detail: 'No encontrado.' }, { status: 404 }),
  )
  return posts
}

async function fillForm() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Nombre'), 'Iker')
  await user.type(screen.getByLabelText('Fecha de nacimiento'), '2004-05-10')
  await user.selectOptions(screen.getByLabelText('Posición'), 'MC')
  await user.selectOptions(screen.getByLabelText('Pierna dominante'), 'D')
  await user.type(screen.getByLabelText('Zona'), 'Bilbao')
  return user
}

beforeEach(() => mockRefresh(true))

describe('JugadorCreatePage acceso', () => {
  it('muestra cargando mientras no se sabe quién es el usuario', async () => {
    const release = mockPendingMe({ jugador_id: null })
    renderAt('/jugadores/nuevo')

    // The session is known, but /me has not answered yet.
    await screen.findByRole('button', { name: 'Cerrar sesión' })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()

    release()

    expect(await screen.findByLabelText('Nombre')).toHaveValue('')
  })

  it('redirige al login a un visitante anónimo', async () => {
    mockRefresh(false)
    renderAt('/jugadores/nuevo')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirige a su perfil si el usuario ya tiene jugador', async () => {
    mockMe({ jugador_id: 41 })
    mockJugador(41, () => HttpResponse.json(buildJugador({ id: 41, nombre: 'Ana Ruiz' })))
    renderAt('/jugadores/nuevo')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })
})

describe('JugadorCreatePage creación', () => {
  beforeEach(() => mockMe({ jugador_id: null }))

  it('muestra el formulario vacío en /jugadores/nuevo', async () => {
    renderAt('/jugadores/nuevo')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crear mi perfil' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    expect(screen.getByLabelText('Posición')).toHaveDisplayValue('Selecciona una posición')
    expect(screen.getByLabelText('Disponible')).toBeChecked()
  })

  it('crea el perfil y muestra el detalle como propio', async () => {
    const posts = mockCreatableJugador()
    renderAt('/jugadores/nuevo')

    const user = await fillForm()
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Iker' })).toBeInTheDocument()
    // Only an owner sees this link: proves the new profile was linked to the user.
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute(
      'href',
      '/jugadores/42/editar',
    )
    expect(posts).toEqual([
      {
        nombre: 'Iker',
        fecha_nacimiento: '2004-05-10',
        posicion: 'MC',
        pierna_dominante: 'D',
        zona: 'Bilbao',
        club_actual: '',
        disponible: true,
        bio: '',
      },
    ])
  })

  it('muestra los errores de validación del servidor', async () => {
    server.use(
      http.post('/api/jugadores/', () =>
        HttpResponse.json({ posicion: ['"" no es una elección válida.'] }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/jugadores/nuevo')

    await user.type(await screen.findByLabelText('Nombre'), 'Iker')
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Posición')).toHaveAccessibleDescription(
        '"" no es una elección válida.',
      ),
    )
    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeEnabled()
  })

  it('muestra un error si no se puede crear el perfil', async () => {
    server.use(
      http.post('/api/jugadores/', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
      ),
    )
    renderAt('/jugadores/nuevo')

    const user = await fillForm()
    await user.click(screen.getByRole('button', { name: 'Crear perfil' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el perfil.')
    // What the user typed survives the failure.
    expect(screen.getByLabelText('Nombre')).toHaveValue('Iker')
    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeEnabled()
  })
})
