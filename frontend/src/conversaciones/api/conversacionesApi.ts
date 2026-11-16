import type { AuthFetch } from '../../auth/api/authFetch'

/** Who wrote a message, as a role: the backend never exposes user ids. */
export type RolAutor = 'ojeador' | 'jugador'

export interface Mensaje {
  id: number
  autor: RolAutor
  texto: string
  enviado: string
}

/** Also thrown for conversations the user is not part of: the backend answers 404 to outsiders. */
export class ConversacionNotFoundError extends Error {
  constructor() {
    super('Conversacion not found')
    this.name = 'ConversacionNotFoundError'
  }
}

/** DRF validation failure (400), keyed by field name. */
export class MensajeValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super('Invalid mensaje data')
    this.name = 'MensajeValidationError'
    this.fieldErrors = fieldErrors
  }
}

function mensajesUrl(conversacionId: number) {
  return `/api/conversaciones/${conversacionId}/mensajes/`
}

/** The whole thread, oldest first. */
export async function getMensajes(fetcher: AuthFetch, conversacionId: number): Promise<Mensaje[]> {
  const response = await fetcher(mensajesUrl(conversacionId))
  if (response.status === 404) throw new ConversacionNotFoundError()
  if (!response.ok) throw new Error(`Failed to load mensajes (${response.status})`)
  return (await response.json()) as Mensaje[]
}

export async function enviarMensaje(
  fetcher: AuthFetch,
  conversacionId: number,
  texto: string,
): Promise<Mensaje> {
  const response = await fetcher(mensajesUrl(conversacionId), {
    method: 'POST',
    // Without it DRF cannot parse the body and answers 415.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  })
  if (response.status === 404) throw new ConversacionNotFoundError()
  if (response.status === 400) {
    throw new MensajeValidationError((await response.json()) as Record<string, string[]>)
  }
  if (!response.ok) throw new Error(`Failed to send mensaje (${response.status})`)
  return (await response.json()) as Mensaje
}
