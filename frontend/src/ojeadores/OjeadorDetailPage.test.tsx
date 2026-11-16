import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import { buildOjeador, mockOjeador } from '../test/ojeadoresMocks'
import { server } from '../test/server'

const PENDING_HINT = 'Revisaremos tu perfil y te verificaremos en breve.'

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

beforeEach(() => {
  mockRefresh(true)
  mockMe()
})

describe('OjeadorDetailPage acceso', () => {
  it('redirige al login a un visitante anónimo sin pedir el ojeador', async () => {
    mockRefresh(false)
    const requests = mockOjeador(9)
    renderAt('/ojeadores/9')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('trata un id no válido como no encontrado sin hacer peticiones', async () => {
    // Any request here would be unhandled and fail the test.
    renderAt('/ojeadores/abc')

    expect(await screen.findByText('Ojeador no encontrado.')).toBeInTheDocument()
  })
})

describe('OjeadorDetailPage contenido', () => {
  it('muestra nombre, organización y la insignia de verificado', async () => {
    mockOjeador(9, () =>
      HttpResponse.json(buildOjeador({ id: 9, nombre: 'Ana Ruiz', verificado: true })),
    )
    renderAt('/ojeadores/9')

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })).toBeInTheDocument()
    expect(screen.getByText('CD Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Verificado')).toBeInTheDocument()
    expect(screen.queryByText('Pendiente de verificación')).not.toBeInTheDocument()
  })

  it('muestra "Sin organización" si no tiene organización', async () => {
    mockOjeador(9, () => HttpResponse.json(buildOjeador({ id: 9, organizacion: '' })))
    renderAt('/ojeadores/9')

    expect(await screen.findByText('Sin organización')).toBeInTheDocument()
  })

  it('muestra la insignia de pendiente a un ojeador sin verificar', async () => {
    mockOjeador(9, () => HttpResponse.json(buildOjeador({ id: 9, verificado: false })))
    renderAt('/ojeadores/9')

    expect(await screen.findByText('Pendiente de verificación')).toBeInTheDocument()
    expect(screen.queryByText('Verificado')).not.toBeInTheDocument()
  })

  it('explica al dueño que su perfil pendiente se revisará', async () => {
    mockMe({ ojeador_id: 9 })
    mockOjeador(9, () => HttpResponse.json(buildOjeador({ id: 9, verificado: false })))
    renderAt('/ojeadores/9')

    expect(await screen.findByText(PENDING_HINT)).toBeInTheDocument()
  })

  it('no muestra la explicación al dueño de un perfil verificado', async () => {
    mockMe({ ojeador_id: 9 })
    mockOjeador(9, () => HttpResponse.json(buildOjeador({ id: 9, verificado: true })))
    renderAt('/ojeadores/9')

    await screen.findByText('Verificado')
    expect(screen.queryByText(PENDING_HINT)).not.toBeInTheDocument()
  })

  it('no muestra la explicación a otro usuario', async () => {
    mockMe({ ojeador_id: 3 })
    mockOjeador(9, () => HttpResponse.json(buildOjeador({ id: 9, verificado: false })))
    renderAt('/ojeadores/9')

    await screen.findByText('Pendiente de verificación')
    expect(screen.queryByText(PENDING_HINT)).not.toBeInTheDocument()
  })
})

describe('OjeadorDetailPage errores', () => {
  it('muestra no encontrado si el servidor responde 404', async () => {
    mockOjeador(9, () => HttpResponse.json({ detail: 'No encontrado.' }, { status: 404 }))
    renderAt('/ojeadores/9')

    expect(await screen.findByText('Ojeador no encontrado.')).toBeInTheDocument()
  })

  it('muestra un error y permite reintentar', async () => {
    let fail = true
    mockOjeador(9, () =>
      fail
        ? HttpResponse.json({ detail: 'Error' }, { status: 500 })
        : HttpResponse.json(buildOjeador({ id: 9, nombre: 'Ana Ruiz' })),
    )
    const user = userEvent.setup()
    renderAt('/ojeadores/9')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el ojeador.')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
