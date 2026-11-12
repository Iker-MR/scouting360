import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { JugadorValidationError, updateJugador, type Jugador } from './api/jugadoresApi'
import { JugadorForm, type JugadorFormValues } from './components/JugadorForm'
import { useJugador } from './hooks/useJugador'
import { parseId } from './utils/parseId'

function toFormValues(jugador: Jugador): JugadorFormValues {
  return {
    nombre: jugador.nombre,
    fecha_nacimiento: jugador.fecha_nacimiento,
    posicion: jugador.posicion,
    pierna_dominante: jugador.pierna_dominante,
    zona: jugador.zona,
    club_actual: jugador.club_actual,
    disponible: jugador.disponible,
    bio: jugador.bio,
  }
}

/**
 * Guard for /jugadores/:id/editar. The backend (403) is the real protection;
 * this only keeps non-owners away from a form they could not save.
 */
export function JugadorEditPage() {
  const id = parseId(useParams().id)
  const { status, user, userStatus } = useAuth()
  const isOwner = id !== null && user?.jugador_id === id
  // Fetch only once ownership is known, so redirected visitors cost no request.
  const { data, status: jugadorStatus } = useJugador(isOwner ? id : null)

  // Wait until "who are you" is final: redirecting earlier would kick out the owner.
  if (status === 'checking' || userStatus === 'loading') return <p>Cargando...</p>
  // `replace` keeps /editar out of history, so Back does not bounce here again.
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (!isOwner) {
    return <Navigate to={id === null ? '/jugadores' : `/jugadores/${id}`} replace />
  }

  return (
    <section className="jugador-edit-page">
      <h1>Editar perfil</h1>
      {jugadorStatus === 'loading' && <p>Cargando jugador...</p>}
      {(jugadorStatus === 'notFound' || jugadorStatus === 'error') && (
        <p role="alert">No se pudo cargar el jugador.</p>
      )}
      {jugadorStatus === 'success' && <JugadorEditor key={data.id} jugador={data} />}
    </section>
  )
}

function JugadorEditor({ jugador }: { jugador: Jugador }) {
  const { authFetch } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [saveFailed, setSaveFailed] = useState(false)
  const detailPath = `/jugadores/${jugador.id}`

  async function handleSubmit(values: JugadorFormValues) {
    setSubmitting(true)
    setFieldErrors({})
    setSaveFailed(false)
    try {
      await updateJugador(authFetch, jugador.id, values)
      // Replace the form in history: Back should not reopen a saved form.
      navigate(detailPath, { replace: true })
    } catch (error) {
      if (error instanceof JugadorValidationError) setFieldErrors(error.fieldErrors)
      else setSaveFailed(true)
      setSubmitting(false)
    }
  }

  return (
    <>
      {saveFailed && <p role="alert">No se pudieron guardar los cambios.</p>}
      <JugadorForm
        initialValues={toFormValues(jugador)}
        onSubmit={(values) => void handleSubmit(values)}
        submitting={submitting}
        errors={fieldErrors}
      />
      <p>
        <Link to={detailPath}>Cancelar</Link>
      </p>
    </>
  )
}
