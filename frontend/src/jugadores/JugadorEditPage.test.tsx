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
 * In-memory backend for player 41: GET returns the current state and PATCH
 * merges the body into it, so the detail page shows what was saved.
 * Returns the body of every PATCH received.
 */
function mockEditableJugador(overrides: Partial<Jugador> = {}) {
  let jugador = buildJugador({ id: 41, nombre: 'Ana Ruiz', ...overrides })
  const patches: unknown[] = []
  mockJugador(41, () => HttpResponse.json(jugador))
  server.use(
    http.patch('/api/jugadores/41/', async ({ request }) => {
      const body = (await request.json()) as Partial<Jugador>
      patches.push(body)
      jugador = { ...jugador, ...body }
      return HttpResponse.json(jugador)
    }),
  )
  return patches
}

beforeEach(() => mockRefresh(true))

describe('JugadorEditPage acceso', () => {
  it('muestra cargando mientras no se sabe quién es el usuario', async () => {
    const release = mockPendingMe({ jugador_id: 41 })
    mockEditableJugador()
    renderAt('/jugadores/41/editar')

    // The session is known, but /me has not answered yet.
    await screen.findByRole('button', { name: 'Cerrar sesión' })
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()

    release()

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana Ruiz')
  })

  it('redirige al login a un visitante anónimo', async () => {
    mockRefresh(false)
    renderAt('/jugadores/41/editar')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('redirige al detalle a quien no es el dueño', async () => {
    mockMe({ jugador_id: 99 })
    const requests = mockJugador(41, () =>
      HttpResponse.json(buildJugador({ id: 41, nombre: 'Ana Ruiz' })),
    )
    renderAt('/jugadores/41/editar')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    // Give a late request the chance to show up: only the detail page fetches.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(1)
  })
})

describe('JugadorEditPage edición', () => {
  beforeEach(() => mockMe({ jugador_id: 41 }))

  it('muestra al dueño el formulario con sus datos', async () => {
    mockEditableJugador({ zona: 'Sevilla' })
    renderAt('/jugadores/41/editar')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar perfil' }),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana Ruiz')
    expect(screen.getByLabelText('Zona')).toHaveValue('Sevilla')
  })

  it('guarda los cambios y vuelve al detalle', async () => {
    const patches = mockEditableJugador()
    const user = userEvent.setup()
    renderAt('/jugadores/41/editar')

    const nombre = await screen.findByLabelText('Nombre')
    await user.clear(nombre)
    await user.type(nombre, 'Ana María Ruiz')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana María Ruiz' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(patches).toEqual([expect.objectContaining({ nombre: 'Ana María Ruiz' })])
  })

  it('muestra los errores de validación del servidor', async () => {
    mockEditableJugador()
    server.use(
      http.patch('/api/jugadores/41/', () =>
        HttpResponse.json({ nombre: ['Este campo no puede estar en blanco.'] }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/jugadores/41/editar')

    await user.clear(await screen.findByLabelText('Nombre'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription(
        'Este campo no puede estar en blanco.',
      ),
    )
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })

  it('muestra un error si no se puede cargar el jugador', async () => {
    mockJugador(41, () => HttpResponse.json({ detail: 'Server error' }, { status: 500 }))
    renderAt('/jugadores/41/editar')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el jugador.')
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('cancelar vuelve al detalle sin guardar', async () => {
    const patches = mockEditableJugador()
    const user = userEvent.setup()
    renderAt('/jugadores/41/editar')

    await user.type(await screen.findByLabelText('Nombre'), ' cambiado')
    await user.click(screen.getByRole('link', { name: 'Cancelar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' }),
    ).toBeInTheDocument()
    expect(patches).toEqual([])
  })

  it('muestra un error si no se pueden guardar los cambios', async () => {
    mockEditableJugador()
    server.use(
      http.patch('/api/jugadores/41/', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/jugadores/41/editar')

    const nombre = await screen.findByLabelText('Nombre')
    await user.clear(nombre)
    await user.type(nombre, 'Ana María Ruiz')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron guardar los cambios.',
    )
    // What the user typed survives the failure.
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana María Ruiz')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })
})
