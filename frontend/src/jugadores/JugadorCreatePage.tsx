import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { createJugador, JugadorValidationError } from './api/jugadoresApi'
import { JugadorForm, type JugadorFormValues } from './components/JugadorForm'

const EMPTY_VALUES: JugadorFormValues = {
  nombre: '',
  fecha_nacimiento: '',
  // Nothing preselected: a default would let a player save a wrong position unnoticed.
  posicion: '',
  pierna_dominante: '',
  zona: '',
  club_actual: '',
  // Mirrors the backend default.
  disponible: true,
  bio: '',
}

/**
 * Guard for /jugadores/nuevo: only signed-in users without a player profile
 * may create one. The backend still rejects a second profile (400).
 */
export function JugadorCreatePage() {
  const { status, user, userStatus } = useAuth()

  // Wait until "who are you" is final: redirecting earlier would send the user away.
  if (status === 'checking' || userStatus === 'loading') return <p>Cargando...</p>
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (user?.jugador_id != null) return <Navigate to={`/jugadores/${user.jugador_id}`} replace />

  return (
    <section className="jugador-create-page">
      <h1>Crear mi perfil</h1>
      <JugadorCreator />
    </section>
  )
}

function JugadorCreator() {
  const { authFetch, linkJugador } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [saveFailed, setSaveFailed] = useState(false)

  async function handleSubmit(values: JugadorFormValues) {
    setSubmitting(true)
    setFieldErrors({})
    setSaveFailed(false)
    try {
      const creado = await createJugador(authFetch, values)
      // React batches both updates into one render, so the detail page mounts
      // already knowing the user owns it.
      linkJugador(creado.id)
      // Replace the form in history: Back should not reopen it.
      navigate(`/jugadores/${creado.id}`, { replace: true })
    } catch (error) {
      if (error instanceof JugadorValidationError) setFieldErrors(error.fieldErrors)
      else setSaveFailed(true)
      setSubmitting(false)
    }
  }

  return (
    <>
      {saveFailed && <p role="alert">No se pudo crear el perfil.</p>}
      <JugadorForm
        initialValues={EMPTY_VALUES}
        onSubmit={(values) => void handleSubmit(values)}
        submitting={submitting}
        errors={fieldErrors}
        submitLabel="Crear perfil"
      />
    </>
  )
}
