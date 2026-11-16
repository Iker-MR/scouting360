import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { mockMe } from '../test/authMocks'
import {
  buildMensaje,
  mockIniciarConversacion,
  mockMensajes,
} from '../test/conversacionesMocks'
import { buildJugador, mockJugador } from '../test/jugadoresMocks'
import { server } from '../test/server'

const TEXTO = 'Hola, te vi jugar el domingo.'
const AVISO_CUPO =
  'Usaste tus 3 conversaciones del plan gratis. Pasate a premium para contactar a más jugadores.'
const AVISO_VERIFICACION = 'Tenés que estar verificado para contactar a menores de edad.'
const AVISO_YA_EXISTE = 'Ya tenés una conversación con este jugador.'

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

async function escribirYEnviar(texto = TEXTO) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Contactar' }))
  await user.type(screen.getByLabelText('Tu mensaje'), texto)
  await user.click(screen.getByRole('button', { name: 'Enviar' }))
}

beforeEach(() => {
  mockRefresh(true)
  mockMe({ ojeador_id: 9 })
  mockJugador(7, () => HttpResponse.json(buildJugador({ id: 7, nombre: 'Iker M.' })))
})

describe('Contactar visibilidad', () => {
  it('no se muestra a un visitante anónimo', async () => {
    mockRefresh(false)
    renderAt('/jugadores/7')

    await screen.findByRole('heading', { level: 1, name: 'Iker M.' })
    expect(screen.queryByRole('button', { name: 'Contactar' })).not.toBeInTheDocument()
  })

  it('no se muestra a un jugador', async () => {
    mockMe({ jugador_id: 3 })
    renderAt('/jugadores/7')

    await screen.findByRole('heading', { level: 1, name: 'Iker M.' })
    expect(screen.queryByRole('button', { name: 'Contactar' })).not.toBeInTheDocument()
  })

  it('un ojeador lo ve y al tocarlo puede escribir el primer mensaje', async () => {
    const user = userEvent.setup()
    renderAt('/jugadores/7')

    await user.click(await screen.findByRole('button', { name: 'Contactar' }))

    expect(screen.getByLabelText('Tu mensaje')).toBeInTheDocument()
  })
})

describe('Contactar envío', () => {
  it('inicia la conversación y lleva al hilo nuevo', async () => {
    const bodies = mockIniciarConversacion(() =>
      HttpResponse.json({ id: 4, jugador: 7, creada: '2026-11-16T10:00:00Z' }, { status: 201 }),
    )
    mockMensajes(4, () => HttpResponse.json([buildMensaje({ autor: 'ojeador', texto: TEXTO })]))
    renderAt('/jugadores/7')

    await escribirYEnviar()

    expect(await screen.findByRole('list', { name: 'Mensajes' })).toHaveTextContent(TEXTO)
    expect(bodies).toEqual([{ jugador: 7, texto: TEXTO }])
  })

  it('avisa que pase a premium si agotó el cupo y conserva el texto', async () => {
    mockIniciarConversacion(() =>
      HttpResponse.json(
        { detail: 'Agotaste las conversaciones del plan gratis.', code: 'cupo_agotado' },
        { status: 403 },
      ),
    )
    renderAt('/jugadores/7')

    await escribirYEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent(AVISO_CUPO)
    expect(screen.getByLabelText('Tu mensaje')).toHaveValue(TEXTO)
  })

  it('avisa que se verifique para contactar a un menor', async () => {
    mockIniciarConversacion(() =>
      HttpResponse.json(
        { detail: 'Tenés que estar verificado.', code: 'requiere_verificacion' },
        { status: 403 },
      ),
    )
    renderAt('/jugadores/7')

    await escribirYEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent(AVISO_VERIFICACION)
  })

  it('avisa si ya existe una conversación con el jugador', async () => {
    mockIniciarConversacion(() =>
      HttpResponse.json({ jugador: [AVISO_YA_EXISTE] }, { status: 400 }),
    )
    renderAt('/jugadores/7')

    await escribirYEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent(AVISO_YA_EXISTE)
  })
})
