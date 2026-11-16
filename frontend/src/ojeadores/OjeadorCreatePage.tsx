import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { createOjeador, OjeadorValidationError, type OjeadorDatos } from './api/ojeadoresApi'
import { OjeadorForm } from './components/OjeadorForm'

const EMPTY_VALUES: OjeadorDatos = { nombre: '', organizacion: '' }

/**
 * Guard for /ojeadores/nuevo: only signed-in users without any role may
 * become scouts. The backend still enforces one role per user (400).
 */
export function OjeadorCreatePage() {
  const { status, user, userStatus } = useAuth()

  // Wait until "who are you" is final: redirecting earlier would send the user away.
  if (status === 'checking' || userStatus === 'loading') return <p>Cargando...</p>
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (user?.jugador_id != null) return <Navigate to={`/jugadores/${user.jugador_id}`} replace />
  if (user?.ojeador_id != null) return <Navigate to="/jugadores" replace />

  return (
    <section className="ojeador-create-page">
      <h1>Crear perfil de ojeador</h1>
      <OjeadorCreator />
    </section>
  )
}

function OjeadorCreator() {
  const { authFetch, linkOjeador } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [saveFailed, setSaveFailed] = useState(false)

  async function handleSubmit(values: OjeadorDatos) {
    setSubmitting(true)
    setFieldErrors({})
    setSaveFailed(false)
    try {
      const creado = await createOjeador(authFetch, values)
      linkOjeador(creado.id)
      // A scout comes to browse players. Replace the form: Back should not reopen it.
      navigate('/jugadores', { replace: true })
    } catch (error) {
      if (error instanceof OjeadorValidationError) setFieldErrors(error.fieldErrors)
      else setSaveFailed(true)
      setSubmitting(false)
    }
  }

  return (
    <>
      {saveFailed && <p role="alert">No se pudo crear el perfil.</p>}
      <OjeadorForm
        initialValues={EMPTY_VALUES}
        onSubmit={(values) => void handleSubmit(values)}
        submitting={submitting}
        errors={fieldErrors}
        submitLabel="Crear perfil"
      />
    </>
  )
}
