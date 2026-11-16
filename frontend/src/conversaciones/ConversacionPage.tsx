import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { parseId } from '../shared/parseId'
import { enviarMensaje, MensajeValidationError } from './api/conversacionesApi'
import { MensajeComposer } from './components/MensajeComposer'
import { MensajeList } from './components/MensajeList'
import { useMensajes } from './hooks/useMensajes'

const ERROR_ENVIO = 'No se pudo enviar el mensaje. Probá de nuevo.'

/** One conversation thread. Only its scout and its player can see it. */
export function ConversacionPage() {
  const id = parseId(useParams().id)
  const { status, user, userStatus, authFetch } = useAuth()
  // Fetch only with a session, so anonymous visitors cost no request.
  const mensajes = useMensajes(status === 'authenticated' ? id : null)
  const [errores, setErrores] = useState<string[]>([])

  // Wait for /me too: without the user we cannot tell which messages are "Vos".
  if (status === 'checking' || userStatus === 'loading') return <p>Cargando...</p>
  // `replace` keeps this page out of history, so Back does not bounce here again.
  if (status === 'anonymous') return <Navigate to="/login" replace />

  // Roles are exclusive: a scout is never also a player.
  const miRol = user?.ojeador_id != null ? 'ojeador' : 'jugador'

  async function handleEnviar(texto: string) {
    if (id === null) return false
    try {
      mensajes.agregar(await enviarMensaje(authFetch, id, texto))
      setErrores([])
      return true
    } catch (error) {
      setErrores(
        error instanceof MensajeValidationError
          ? (error.fieldErrors.texto ?? [ERROR_ENVIO])
          : [ERROR_ENVIO],
      )
      return false
    }
  }

  return (
    <section className="conversacion-page">
      {mensajes.status === 'loading' && <p>Cargando conversación...</p>}

      {mensajes.status === 'notFound' && <p>Conversación no encontrada.</p>}

      {mensajes.status === 'error' && (
        <div role="alert">
          <p>No se pudo cargar la conversación.</p>
          <button type="button" onClick={mensajes.retry}>
            Reintentar
          </button>
        </div>
      )}

      {mensajes.status === 'success' && (
        <>
          <MensajeList mensajes={mensajes.data} miRol={miRol} />
          <MensajeComposer onEnviar={handleEnviar} errores={errores} />
        </>
      )}
    </section>
  )
}
