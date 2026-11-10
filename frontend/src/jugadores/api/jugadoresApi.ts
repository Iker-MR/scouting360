import type { AuthFetch } from '../../auth/api/authFetch'

export type Posicion = 'PO' | 'DC' | 'LD' | 'LI' | 'MC' | 'MP' | 'ED' | 'EI' | 'DL'

export const POSICIONES: Record<Posicion, string> = {
  PO: 'Portero',
  DC: 'Defensa central',
  LD: 'Lateral derecho',
  LI: 'Lateral izquierdo',
  MC: 'Mediocentro',
  MP: 'Mediapunta',
  ED: 'Extremo derecho',
  EI: 'Extremo izquierdo',
  DL: 'Delantero centro',
}

export interface Atributos {
  ritmo: number
  tiro: number
  pase: number
  regate: number
  defensa: number
  fisico: number
}

export interface Jugador {
  id: number
  usuario: number
  nombre: string
  fecha_nacimiento: string
  posicion: Posicion
  posicion_display: string
  pierna_dominante: 'D' | 'I'
  zona: string
  club_actual: string
  disponible: boolean
  foto: string | null
  bio: string
  atributos: Atributos | null
  overall: number | null
  creado: string
}

export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const PAGE_SIZE = 20

export interface JugadoresQuery {
  page?: number
  search?: string
  posicion?: Posicion | ''
}

export function isPosicion(value: string | null): value is Posicion {
  return value !== null && value in POSICIONES
}

export async function listJugadores(
  fetcher: AuthFetch,
  { page, search, posicion }: JugadoresQuery = {},
): Promise<Page<Jugador>> {
  const params = new URLSearchParams()
  if (page && page > 1) params.set('page', String(page))
  if (search) params.set('search', search)
  if (posicion) params.set('posicion', posicion)

  const query = params.toString()
  const response = await fetcher(`/api/jugadores/${query ? `?${query}` : ''}`)
  if (!response.ok) throw new Error(`Failed to load jugadores (${response.status})`)
  return (await response.json()) as Page<Jugador>
}
