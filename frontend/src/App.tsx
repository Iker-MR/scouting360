import { Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { useAuth } from './auth/useAuth'
import { JugadorDetailPage } from './jugadores/JugadorDetailPage'
import { JugadoresPage } from './jugadores/JugadoresPage'
import { AppHeader } from './layout/AppHeader'

function LoginRoute() {
  const { status } = useAuth()

  if (status === 'checking') return <p>Cargando...</p>
  if (status === 'authenticated') return <Navigate to="/jugadores" replace />
  return <LoginPage />
}

function App() {
  return (
    <AuthProvider>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/jugadores" element={<JugadoresPage />} />
          <Route path="/jugadores/:id" element={<JugadorDetailPage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="*" element={<Navigate to="/jugadores" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  )
}

export default App
