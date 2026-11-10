import { useState, type FormEvent } from 'react'

interface LoginFormProps {
  onSubmit: (username: string, password: string) => void
  isSubmitting: boolean
  errorMessage?: string | null
}

export function LoginForm({ onSubmit, isSubmitting, errorMessage }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(username, password)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Iniciar sesión</h1>
      <div>
        <label htmlFor="username">Usuario</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
