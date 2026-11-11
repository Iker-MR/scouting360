import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { mockMe } from '../test/authMocks'
import { server } from '../test/server'
import { AuthProvider } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { useAuth } from './useAuth'

function ProtectedProbe() {
  const { status, authFetch } = useAuth()
  if (status === 'checking') return <p>Cargando...</p>
  if (status === 'anonymous') return <LoginPage />
  return (
    <button onClick={() => void authFetch('/api/protected/')}>Llamar endpoint</button>
  )
}

beforeEach(() => mockMe())

describe('AuthProvider authFetch', () => {
  it('una sesión expirada vuelve al formulario de login', async () => {
    let refreshCalls = 0
    server.use(
      http.post('/api/auth/token/refresh/', () => {
        refreshCalls += 1
        // First call restores the session on mount; later ones fail (expired).
        return refreshCalls === 1
          ? HttpResponse.json({ access: 'access-1' })
          : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      }),
      http.get('/api/protected/', () =>
        HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <ProtectedProbe />
      </AuthProvider>,
    )

    await user.click(await screen.findByRole('button', { name: /llamar endpoint/i }))

    expect(await screen.findByLabelText(/usuario/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })
})

function mockRefresh(valid: boolean) {
  server.use(
    http.post('/api/auth/token/refresh/', () =>
      valid
        ? HttpResponse.json({ access: 'access-refresh' })
        : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
    ),
  )
}

function CurrentUserProbe() {
  const { status, user, login, logout } = useAuth()
  if (status === 'checking') return <p>Cargando...</p>
  return (
    <>
      <p>
        Usuario:{' '}
        {user ? `${user.username} (jugador ${user.jugador_id ?? 'ninguno'})` : 'ninguno'}
      </p>
      <button onClick={() => void login('ojeadora', 'clave-segura-123')}>Entrar</button>
      <button onClick={() => void logout()}>Salir</button>
    </>
  )
}

function renderProbe() {
  return render(
    <AuthProvider>
      <CurrentUserProbe />
    </AuthProvider>,
  )
}

describe('AuthProvider usuario actual', () => {
  it('carga el usuario actual al recuperar la sesión', async () => {
    mockRefresh(true)
    const meRequests = mockMe({ username: 'ojeadora', jugador_id: 7 })
    renderProbe()

    expect(await screen.findByText('Usuario: ojeadora (jugador 7)')).toBeInTheDocument()
    expect(meRequests).toEqual(['Bearer access-refresh'])
  })

  it('carga el usuario actual al iniciar sesión', async () => {
    mockRefresh(false)
    server.use(
      http.post('/api/auth/token/', () => HttpResponse.json({ access: 'access-login' })),
    )
    const meRequests = mockMe({ username: 'ojeadora', jugador_id: null })
    const user = userEvent.setup()
    renderProbe()

    await user.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Usuario: ojeadora (jugador ninguno)')).toBeInTheDocument()
    expect(meRequests).toEqual(['Bearer access-login'])
  })

  it('no pide el usuario actual a un visitante anónimo', async () => {
    mockRefresh(false)
    const meRequests = mockMe()
    renderProbe()

    expect(await screen.findByText('Usuario: ninguno')).toBeInTheDocument()
    // Give a late request the chance to show up.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(meRequests).toHaveLength(0)
  })

  it('olvida el usuario al cerrar sesión', async () => {
    mockRefresh(true)
    mockMe({ username: 'ojeadora', jugador_id: 7 })
    server.use(http.post('/api/auth/logout/', () => new HttpResponse(null, { status: 204 })))
    const user = userEvent.setup()
    renderProbe()
    await screen.findByText('Usuario: ojeadora (jugador 7)')

    await user.click(screen.getByRole('button', { name: 'Salir' }))

    expect(await screen.findByText('Usuario: ninguno')).toBeInTheDocument()
  })
})
