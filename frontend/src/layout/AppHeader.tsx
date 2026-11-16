import { Link } from 'react-router'
import type { CurrentUser } from '../auth/api/authApi'
import { useAuth } from '../auth/useAuth'

/** Roles are exclusive, so a user sees the links of their role or the way to pick one. */
function ProfileLinks({ user }: { user: CurrentUser }) {
  if (user.jugador_id !== null) return <Link to={`/jugadores/${user.jugador_id}`}>Mi perfil</Link>
  if (user.ojeador_id !== null) return <Link to={`/ojeadores/${user.ojeador_id}`}>Mi perfil</Link>
  return (
    <>
      <Link to="/jugadores/nuevo">Crear mi perfil</Link>
      <Link to="/ojeadores/nuevo">Soy ojeador</Link>
    </>
  )
}

export function AppHeader() {
  const { status, user, userStatus, logout } = useAuth()
  // Only once /me has answered with a user: before that (or if it failed) we
  // cannot tell whether a profile exists, and a wrong link is worse than none.
  const knownUser = status === 'authenticated' && userStatus === 'ready' ? user : null

  return (
    <header className="app-header">
      <Link to="/jugadores" className="app-header__brand">
        Scouting360
      </Link>
      {knownUser && <ProfileLinks user={knownUser} />}
      {status === 'anonymous' && <Link to="/login">Iniciar sesión</Link>}
      {status === 'authenticated' && (
        <button type="button" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      )}
    </header>
  )
}
