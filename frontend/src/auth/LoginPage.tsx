import { useState } from 'react'
import { InvalidCredentialsError } from './api/authApi'
import { LoginForm } from './components/LoginForm'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(username: string, password: string) {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await login(username, password)
    } catch (error) {
      setErrorMessage(
        error instanceof InvalidCredentialsError
          ? 'Usuario o contraseña incorrectos.'
          : 'Algo salió mal. Inténtalo de nuevo.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    />
  )
}
