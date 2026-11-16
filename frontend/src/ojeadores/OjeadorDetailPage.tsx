import { Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { parseId } from '../shared/parseId'
import { OjeadorDetail } from './components/OjeadorDetail'
import { useOjeador } from './hooks/useOjeador'

/**
 * Scout profiles are private to signed-in users (the backend answers 401),
 * unlike player profiles, which anyone may read.
 */
export function OjeadorDetailPage() {
  const id = parseId(useParams().id)
  const { status, user } = useAuth()
  // Fetch only with a session, so anonymous visitors cost no request.
  const { data, status: ojeadorStatus, retry } = useOjeador(
    status === 'authenticated' ? id : null,
  )

  if (status === 'checking') return <p>Cargando...</p>
  // `replace` keeps this page out of history, so Back does not bounce here again.
  if (status === 'anonymous') return <Navigate to="/login" replace />

  return (
    <section className="ojeador-detail-page">
      {ojeadorStatus === 'loading' && <p>Cargando ojeador...</p>}

      {ojeadorStatus === 'notFound' && <p>Ojeador no encontrado.</p>}

      {ojeadorStatus === 'error' && (
        <div role="alert">
          <p>No se pudo cargar el ojeador.</p>
          <button type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {ojeadorStatus === 'success' && (
        <OjeadorDetail ojeador={data} isOwner={user?.ojeador_id === data.id} />
      )}
    </section>
  )
}
