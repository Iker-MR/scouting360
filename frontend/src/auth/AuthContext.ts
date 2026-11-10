import { createContext } from 'react'
import type { AuthFetch } from './api/authFetch'

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  accessToken: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  authFetch: AuthFetch
}

export const AuthContext = createContext<AuthContextValue | null>(null)
