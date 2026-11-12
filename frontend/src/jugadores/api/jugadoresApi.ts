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

export class JugadorNotFoundError extends Error {
  constructor() {
    super('Jugador not found')
    this.name = 'JugadorNotFoundError'
  }
}

export async function getJugador(fetcher: AuthFetch, id: number): Promise<Jugador> {
  const response = await fetcher(`/api/jugadores/${id}/`)
  if (response.status === 404) throw new JugadorNotFoundError()
  if (!response.ok) throw new Error(`Failed to load jugador (${response.status})`)
  return (await response.json()) as Jugador
}

/** Personal fields a player may edit; atributos and foto are managed elsewhere. */
export type JugadorCambios = Partial<
  Pick<
    Jugador,
    | 'nombre'
    | 'fecha_nacimiento'
    | 'posicion'
    | 'pierna_dominante'
    | 'zona'
    | 'club_actual'
    | 'disponible'
    | 'bio'
  >
>

/** DRF validation failure (400), keyed by field name. */
export class JugadorValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super('Invalid jugador data')
    this.name = 'JugadorValidationError'
    this.fieldErrors = fieldErrors
  }
}

export async function updateJugador(
  fetcher: AuthFetch,
  id: number,
  cambios: JugadorCambios,
): Promise<Jugador> {
  const response = await fetcher(`/api/jugadores/${id}/`, {
    method: 'PATCH',
    // Without it DRF cannot parse the body and answers 415.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
  if (response.status === 400) {
    throw new JugadorValidationError((await response.json()) as Record<string, string[]>)
  }
  if (!response.ok) throw new Error(`Failed to update jugador (${response.status})`)
  return (await response.json()) as Jugador
}
