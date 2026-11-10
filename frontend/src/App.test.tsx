import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { server } from './test/server'
import App from './App'

const ACCESS_TOKEN = 'access-token-123'

function mockRefresh(status: 'valid' | 'invalid') {
  server.use(
    http.post('/api/auth/token/refresh/', () =>
      status === 'valid'
        ? HttpResponse.json({ access: ACCESS_TOKEN })
        : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 }),
    ),
  )
}

function mockLogin(handler?: Parameters<typeof http.post>[1]) {
  server.use(
    http.post(
      '/api/auth/token/',
      handler ??
        (async ({ request }) => {
          const body = (await request.json()) as {
            username: string
            password: string
          }
          if (body.username === 'scout' && body.password === 'secret') {
            return HttpResponse.json({ access: ACCESS_TOKEN })
          }
          return HttpResponse.json(
            { detail: 'No active account found with the given credentials' },
            { status: 401 },
          )
        }),
    ),
  )
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  username: string,
  password: string,
) {
  await user.type(await screen.findByLabelText(/usuario/i), username)
  await user.type(screen.getByLabelText(/contraseña/i), password)
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
}

describe('Flujo de login', () => {
  it('muestra la vista autenticada tras un login exitoso', async () => {
    mockRefresh('invalid')
    mockLogin()
    const user = userEvent.setup()
    render(<App />)

    await fillAndSubmit(user, 'scout', 'secret')

    expect(await screen.findByText(/has iniciado sesión/i)).toBeInTheDocument()
  })

  it('muestra un error de credenciales y permanece en el formulario ante un 401', async () => {
    mockRefresh('invalid')
    mockLogin()
    const user = userEvent.setup()
    render(<App />)

    await fillAndSubmit(user, 'scout', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /usuario o contraseña incorrectos/i,
    )
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument()
    expect(screen.queryByText(/has iniciado sesión/i)).not.toBeInTheDocument()
  })

  it('deshabilita el boton de envio mientras se esta enviando', async () => {
    mockRefresh('invalid')
    mockLogin(async () => {
      await delay(100)
      return HttpResponse.json({ access: ACCESS_TOKEN })
    })
    const user = userEvent.setup()
    render(<App />)

    await fillAndSubmit(user, 'scout', 'secret')

    expect(screen.getByRole('button', { name: /iniciando sesión/i })).toBeDisabled()
    expect(await screen.findByText(/has iniciado sesión/i)).toBeInTheDocument()
  })

  it('restaura la sesion al cargar cuando el refresh tiene exito', async () => {
    mockRefresh('valid')
    render(<App />)

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
    expect(await screen.findByText(/has iniciado sesión/i)).toBeInTheDocument()
  })

  it('restaura la sesion en StrictMode aunque el refresh rote el token', async () => {
    let refreshCalls = 0
    server.use(
      http.post('/api/auth/token/refresh/', async () => {
        refreshCalls += 1
        await delay(10)
        // The backend blacklists the cookie after the first rotation.
        return refreshCalls === 1
          ? HttpResponse.json({ access: ACCESS_TOKEN })
          : HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 })
      }),
    )
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    expect(await screen.findByText(/has iniciado sesión/i)).toBeInTheDocument()
    expect(refreshCalls).toBe(1)
  })

  it('queda anonimo cuando el refresh devuelve 401', async () => {
    mockRefresh('invalid')
    render(<App />)

    expect(await screen.findByLabelText(/usuario/i)).toBeInTheDocument()
    expect(screen.queryByText(/has iniciado sesión/i)).not.toBeInTheDocument()
  })

  it('al cerrar sesion llama a logout y vuelve al formulario', async () => {
    mockRefresh('valid')
    let logoutCalled = false
    server.use(
      http.post('/api/auth/logout/', () => {
        logoutCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /cerrar sesión/i }))

    expect(await screen.findByLabelText(/usuario/i)).toBeInTheDocument()
    expect(logoutCalled).toBe(true)
  })

  it('no guarda el access token en localStorage ni sessionStorage', async () => {
    mockRefresh('invalid')
    mockLogin()
    const user = userEvent.setup()
    render(<App />)

    await fillAndSubmit(user, 'scout', 'secret')
    await screen.findByText(/has iniciado sesión/i)

    const stored = JSON.stringify({ ...localStorage, ...sessionStorage })
    expect(stored).not.toContain(ACCESS_TOKEN)
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})
