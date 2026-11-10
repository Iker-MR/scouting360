import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { useAuth } from './auth/useAuth'

function AppContent() {
  const { status, logout } = useAuth()

  if (status === 'checking') return <p>Cargando...</p>
  if (status === 'anonymous') return <LoginPage />

  return (
    <main>
      <p>Has iniciado sesión</p>
      <button type="button" onClick={() => void logout()}>
        Cerrar sesión
      </button>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
