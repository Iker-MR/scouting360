import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { JugadorDetail } from './components/JugadorDetail'
import { useJugador } from './hooks/useJugador'

function parseId(value: string | undefined) {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : null
}

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
  const { user } = useAuth()
  const back = <Link to={listPath(location.state)}>Volver al listado</Link>

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

      <p className="jugador-detail-page__back">{back}</p>
    </section>
  )
}
