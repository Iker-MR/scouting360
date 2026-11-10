import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'

export function AppHeader() {
  const { status, logout } = useAuth()

  return (
    <header className="app-header">
      <Link to="/jugadores" className="app-header__brand">
        Scouting360
      </Link>
      {status === 'anonymous' && <Link to="/login">Iniciar sesión</Link>}
      {status === 'authenticated' && (
        <button type="button" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      )}
    </header>
  )
}
