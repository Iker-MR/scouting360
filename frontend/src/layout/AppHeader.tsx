import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'

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
      {knownUser &&
        (knownUser.jugador_id === null ? (
          <Link to="/jugadores/nuevo">Crear mi perfil</Link>
        ) : (
          <Link to={`/jugadores/${knownUser.jugador_id}`}>Mi perfil</Link>
        ))}
      {status === 'anonymous' && <Link to="/login">Iniciar sesión</Link>}
      {status === 'authenticated' && (
        <button type="button" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      )}
    </header>
  )
}
