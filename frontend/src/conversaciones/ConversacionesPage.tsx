import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ConversacionList } from './components/ConversacionList'
import { useConversaciones } from './hooks/useConversaciones'

/** Inbox: every conversation the user takes part in, as scout or as player. */
export function ConversacionesPage() {
  const { status, user, userStatus } = useAuth()
  // Fetch only with a session, so anonymous visitors cost no request.
  const conversaciones = useConversaciones(status === 'authenticated')

  // Wait for /me too: without the user we cannot tell which side to show.
  if (status === 'checking' || userStatus === 'loading') return <p>Cargando...</p>
  // `replace` keeps this page out of history, so Back does not bounce here again.
  if (status === 'anonymous') return <Navigate to="/login" replace />

  // Roles are exclusive: a scout is never also a player.
  const miRol = user?.ojeador_id != null ? 'ojeador' : 'jugador'

  return (
    <section className="conversaciones-page">
      <h1>Mensajes</h1>

      {conversaciones.status === 'loading' && <p>Cargando conversaciones...</p>}

      {conversaciones.status === 'error' && (
        <div role="alert">
          <p>No se pudieron cargar las conversaciones.</p>
          <button type="button" onClick={conversaciones.retry}>
            Reintentar
          </button>
        </div>
      )}

      {conversaciones.status === 'success' && conversaciones.data.results.length === 0 && (
        <p>Todavía no tenés conversaciones.</p>
      )}

      {conversaciones.status === 'success' && conversaciones.data.results.length > 0 && (
        <ConversacionList conversaciones={conversaciones.data.results} miRol={miRol} />
      )}
    </section>
  )
}
