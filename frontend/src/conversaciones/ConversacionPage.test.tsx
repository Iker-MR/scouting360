import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import { buildMensaje, mockEnviarMensaje, mockMensajes } from '../test/conversacionesMocks'
import { server } from '../test/server'

const PRIMERO = 'Hola, te vi jugar el domingo.'
const RESPUESTA = '¡Gracias! Cuando quieras hablamos.'

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

function hilo() {
  return [
    buildMensaje({ id: 1, autor: 'ojeador', texto: PRIMERO }),
    buildMensaje({ id: 2, autor: 'jugador', texto: RESPUESTA, enviado: '2026-11-16T11:00:00Z' }),
  ]
}

async function mensajesEnPantalla() {
  const lista = await screen.findByRole('list', { name: 'Mensajes' })
  return within(lista).getAllByRole('listitem')
}

beforeEach(() => {
  mockRefresh(true)
  mockMe({ ojeador_id: 9 })
})

describe('ConversacionPage acceso', () => {
  it('redirige al login a un visitante anónimo sin pedir el hilo', async () => {
    mockRefresh(false)
    const requests = mockMensajes(4)
    renderAt('/conversaciones/4')

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})

describe('ConversacionPage hilo', () => {
  it('muestra los mensajes en orden y marca como "Vos" los del ojeador que mira', async () => {
    mockMensajes(4, () => HttpResponse.json(hilo()))
    renderAt('/conversaciones/4')

    const [primero, segundo] = await mensajesEnPantalla()
    expect(primero).toHaveTextContent('Vos')
    expect(primero).toHaveTextContent(PRIMERO)
    expect(segundo).toHaveTextContent('Jugador')
    expect(segundo).toHaveTextContent(RESPUESTA)
  })

  it('marca como "Vos" los del jugador cuando mira el jugador', async () => {
    mockMe({ jugador_id: 5 })
    mockMensajes(4, () => HttpResponse.json(hilo()))
    renderAt('/conversaciones/4')

    const [primero, segundo] = await mensajesEnPantalla()
    expect(primero).toHaveTextContent('Ojeador')
    expect(segundo).toHaveTextContent('Vos')
  })

  it('muestra no encontrada si el servidor responde 404', async () => {
    // The backend answers 404 to outsiders too: they must not learn it exists.
    mockMensajes(4, () => HttpResponse.json({ detail: 'No encontrado.' }, { status: 404 }))
    renderAt('/conversaciones/4')

    expect(await screen.findByText('Conversación no encontrada.')).toBeInTheDocument()
  })

  it('muestra un error y permite reintentar', async () => {
    let fail = true
    mockMensajes(4, () =>
      fail
        ? HttpResponse.json({ detail: 'Error' }, { status: 500 })
        : HttpResponse.json(hilo()),
    )
    const user = userEvent.setup()
    renderAt('/conversaciones/4')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la conversación.')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await mensajesEnPantalla()).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ConversacionPage responder', () => {
  beforeEach(() => {
    mockMensajes(4, () => HttpResponse.json(hilo()))
  })

  it('envía la respuesta, la agrega al hilo y vacía el campo', async () => {
    const bodies = mockEnviarMensaje(4, ({ texto }) =>
      HttpResponse.json(buildMensaje({ id: 3, autor: 'ojeador', texto }), { status: 201 }),
    )
    const user = userEvent.setup()
    renderAt('/conversaciones/4')
    await mensajesEnPantalla()

    await user.type(screen.getByLabelText('Tu mensaje'), '¿Te viene bien el martes?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('¿Te viene bien el martes?')
    const mensajes = await mensajesEnPantalla()
    expect(mensajes).toHaveLength(3)
    expect(mensajes[2]).toHaveTextContent('Vos')
    expect(mensajes[2]).toHaveTextContent('¿Te viene bien el martes?')
    expect(bodies).toEqual([{ texto: '¿Te viene bien el martes?' }])
    expect(screen.getByLabelText('Tu mensaje')).toHaveValue('')
  })

  it('no permite enviar un mensaje vacío o solo con espacios', async () => {
    const user = userEvent.setup()
    renderAt('/conversaciones/4')
    await mensajesEnPantalla()

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await user.type(screen.getByLabelText('Tu mensaje'), '   ')

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('muestra el error del campo y conserva el texto si el envío falla', async () => {
    mockEnviarMensaje(4, () =>
      HttpResponse.json({ texto: ['Este campo no puede estar en blanco.'] }, { status: 400 }),
    )
    const user = userEvent.setup()
    renderAt('/conversaciones/4')
    await mensajesEnPantalla()

    await user.type(screen.getByLabelText('Tu mensaje'), 'Hola')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Este campo no puede estar en blanco.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tu mensaje')).toHaveValue('Hola')
    expect(await mensajesEnPantalla()).toHaveLength(2)
  })
})
