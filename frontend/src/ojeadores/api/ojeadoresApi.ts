import type { AuthFetch } from '../../auth/api/authFetch'

export interface Ojeador {
  id: number
  nombre: string
  organizacion: string
  /** Set by staff only; a new scout always starts unverified. */
  verificado: boolean
}

export type OjeadorDatos = Pick<Ojeador, 'nombre' | 'organizacion'>

/** DRF validation failure (400), keyed by field name. */
export class OjeadorValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super('Invalid ojeador data')
    this.name = 'OjeadorValidationError'
    this.fieldErrors = fieldErrors
  }
}

export async function createOjeador(fetcher: AuthFetch, datos: OjeadorDatos): Promise<Ojeador> {
  const response = await fetcher('/api/ojeadores/', {
    method: 'POST',
    // Without it DRF cannot parse the body and answers 415.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  if (response.status === 400) {
    throw new OjeadorValidationError((await response.json()) as Record<string, string[]>)
  }
  if (!response.ok) throw new Error(`Failed to create ojeador (${response.status})`)
  return (await response.json()) as Ojeador
}
