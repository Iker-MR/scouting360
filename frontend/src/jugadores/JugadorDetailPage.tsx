import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ContactarJugador } from '../conversaciones/ContactarJugador'
import { JugadorDetail } from './components/JugadorDetail'
import { useJugador } from './hooks/useJugador'
import { parseId } from '../shared/parseId'

// The list link passes its query string so filters survive the round trip.
function listPath(state: unknown) {
  const search =
    typeof state === 'object' && state !== null && 'listSearch' in state
      ? state.listSearch
      : ''
  return `/jugadores${typeof search === 'string' && search.startsWith('?') ? search : ''}`
}

export function JugadorDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { data, status, retry } = useJugador(parseId(id))
  const { status: authStatus, user, userStatus } = useAuth()
  const back = <Link to={listPath(location.state)}>Volver al listado</Link>
  // Profiles are public; only a known scout may start a conversation.
  const esOjeador = authStatus === 'authenticated' && userStatus === 'ready' && user?.ojeador_id != null

  return (
    <section className="jugador-detail-page">
      {status === 'loading' && <p>Cargando jugador...</p>}

      {status === 'notFound' && <p>Jugador no encontrado.</p>}

      {status === 'error' && (
        <div role="alert">
          <p>No se pudo cargar el jugador.</p>
          <button type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && (
        <JugadorDetail
          jugador={data}
          editPath={user?.jugador_id === data.id ? `/jugadores/${data.id}/editar` : undefined}
        />
      )}

      {status === 'success' && esOjeador && <ContactarJugador jugadorId={data.id} />}

      <p className="jugador-detail-page__back">{back}</p>
    </section>
  )
}
