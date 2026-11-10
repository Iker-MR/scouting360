import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
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
