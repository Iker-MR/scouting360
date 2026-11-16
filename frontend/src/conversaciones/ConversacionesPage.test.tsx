import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import {
  buildConversacion,
  conversacionesPage,
  mockConversaciones,
} from '../test/conversacionesMocks'
import { mockJugadores } from '../test/jugadoresMocks'
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

async function bandeja() {
  return screen.findByRole('list', { name: 'Conversaciones' })
}

beforeEach(() => {
  mockRefresh(true)
  mockMe({ ojeador_id: 9 })
})

describe('ConversacionesPage acceso', () => {
  it('redirige al login a un visitante anónimo sin pedir la bandeja', async () => {
    mockRefresh(false)
    const requests = mockConversaciones()
    renderAt('/conversaciones')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})

describe('ConversacionesPage contenido', () => {
  it('el ojeador ve con qué jugador habla y un link al hilo', async () => {
    mockConversaciones(() => conversacionesPage([buildConversacion({ id: 4 })]))
    renderAt('/conversaciones')

    const link = within(await bandeja()).getByRole('link', { name: 'Iker M.' })
    expect(link).toHaveAttribute('href', '/conversaciones/4')
    expect(screen.queryByText('Ana Ruiz')).not.toBeInTheDocument()
  })

  it('el jugador ve con qué ojeador habla', async () => {
    mockMe({ jugador_id: 7 })
    mockConversaciones(() => conversacionesPage([buildConversacion({ id: 4 })]))
    renderAt('/conversaciones')

    const link = within(await bandeja()).getByRole('link', { name: 'Ana Ruiz' })
    expect(link).toHaveAttribute('href', '/conversaciones/4')
    expect(screen.queryByText('Iker M.')).not.toBeInTheDocument()
  })

  it('avisa si todavía no hay conversaciones', async () => {
    mockConversaciones(() => conversacionesPage([]))
    renderAt('/conversaciones')

    expect(await screen.findByText('Todavía no tenés conversaciones.')).toBeInTheDocument()
  })

  it('muestra un error y permite reintentar', async () => {
    let fail = true
    mockConversaciones(() =>
      fail
        ? HttpResponse.json({ detail: 'Error' }, { status: 500 })
        : conversacionesPage([buildConversacion()]),
    )
    const user = userEvent.setup()
    renderAt('/conversaciones')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las conversaciones.',
    )
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(within(await bandeja()).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Link "Mensajes" en el header', () => {
  beforeEach(() => {
    // The header is checked from the player list page.
    mockJugadores()
  })

  it.each([
    ['un ojeador', { ojeador_id: 9 }],
    ['un jugador', { jugador_id: 7 }],
  ])('lo ve %s', async (_quien, me) => {
    mockMe(me)
    renderAt('/jugadores')

    expect(await screen.findByRole('link', { name: 'Mensajes' })).toHaveAttribute(
      'href',
      '/conversaciones',
    )
  })

  it('no lo ve un usuario sin perfil', async () => {
    mockMe({ jugador_id: null, ojeador_id: null })
    renderAt('/jugadores')

    await screen.findByRole('link', { name: 'Soy ojeador' })
    expect(screen.queryByRole('link', { name: 'Mensajes' })).not.toBeInTheDocument()
  })

  it('no lo ve un visitante anónimo', async () => {
    mockRefresh(false)
    renderAt('/jugadores')

    await screen.findByRole('link', { name: 'Iniciar sesión' })
    expect(screen.queryByRole('link', { name: 'Mensajes' })).not.toBeInTheDocument()
  })
})
