import { createContext } from 'react'
import type { CurrentUser } from './api/authApi'
import type { AuthFetch } from './api/authFetch'

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

/**
 * 'loading' while the session is being checked or GET /api/auth/me/ has not
 * answered yet; 'ready' once `user` is final (a user, or null for anonymous
 * visitors and failed lookups). Lets pages tell "not known yet" from "no".
 */
export type UserStatus = 'loading' | 'ready'

export interface AuthContextValue {
  status: AuthStatus
  accessToken: string | null
  /** Null while anonymous and until GET /api/auth/me/ answers. */
  user: CurrentUser | null
  userStatus: UserStatus
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Records a just-created player profile on the current user, without refetching /me. */
  linkJugador: (jugadorId: number) => void
  authFetch: AuthFetch
}

export const AuthContext = createContext<AuthContextValue | null>(null)
