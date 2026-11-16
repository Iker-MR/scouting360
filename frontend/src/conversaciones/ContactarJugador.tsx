import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import {
  ContactoBloqueadoError,
  ConversacionValidationError,
  iniciarConversacion,
} from './api/conversacionesApi'
import { MensajeComposer } from './components/MensajeComposer'

/** Copy for each 403 code the backend sends when it refuses a contact. */
const AVISO_POR_CODIGO: Record<string, string> = {
  cupo_agotado:
    'Usaste tus 3 conversaciones del plan gratis. Pasate a premium para contactar a más jugadores.',
  requiere_verificacion: 'Tenés que estar verificado para contactar a menores de edad.',
}
const AVISO_GENERICO = 'No se pudo enviar el mensaje. Probá de nuevo.'

interface ContactarJugadorProps {
  jugadorId: number
}

/** "Contactar" for scouts: writes the first message and opens the new thread. */
export function ContactarJugador({ jugadorId }: ContactarJugadorProps) {
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errores, setErrores] = useState<string[]>([])

  async function handleEnviar(texto: string) {
    try {
      const conversacion = await iniciarConversacion(authFetch, jugadorId, texto)
      navigate(`/conversaciones/${conversacion.id}`)
      return true
    } catch (error) {
      setErrores([])
      if (error instanceof ContactoBloqueadoError) {
        setAviso(AVISO_POR_CODIGO[error.code] ?? AVISO_GENERICO)
      } else if (error instanceof ConversacionValidationError && error.fieldErrors.texto) {
        setAviso(null)
        setErrores(error.fieldErrors.texto)
      } else if (error instanceof ConversacionValidationError && error.fieldErrors.jugador) {
        setAviso(error.fieldErrors.jugador.join(' '))
      } else {
        setAviso(AVISO_GENERICO)
      }
      return false
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}>
        Contactar
      </button>
    )
  }

  return (
    <div className="contactar-jugador">
      {aviso && (
        <p role="alert" className="contactar-jugador__aviso">
          {aviso}
        </p>
      )}
      <MensajeComposer onEnviar={handleEnviar} errores={errores} />
    </div>
  )
}
