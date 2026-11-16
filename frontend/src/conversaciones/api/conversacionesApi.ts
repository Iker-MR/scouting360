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

export interface Conversacion {
  id: number
  jugador: number
  creada: string
}

/** The backend refused the contact (403). `code` says why; never branch on `detail` text. */
export class ContactoBloqueadoError extends Error {
  readonly code: string

  constructor(code: string) {
    super(`Contacto bloqueado (${code})`)
    this.name = 'ContactoBloqueadoError'
    this.code = code
  }
}

/** DRF validation failure (400) when starting: `jugador` (already talking) or `texto`. */
export class ConversacionValidationError extends Error {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super('Invalid conversacion data')
    this.name = 'ConversacionValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** Starts a conversation with its first message. Scouts only; quota and minors rules apply. */
export async function iniciarConversacion(
  fetcher: AuthFetch,
  jugadorId: number,
  texto: string,
): Promise<Conversacion> {
  const response = await fetcher('/api/conversaciones/', {
    method: 'POST',
    // Without it DRF cannot parse the body and answers 415.
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jugador: jugadorId, texto }),
  })
  if (response.status === 403) {
    const { code } = (await response.json()) as { code?: string }
    throw new ContactoBloqueadoError(code ?? 'permission_denied')
  }
  if (response.status === 400) {
    throw new ConversacionValidationError((await response.json()) as Record<string, string[]>)
  }
  if (!response.ok) throw new Error(`Failed to start conversacion (${response.status})`)
  return (await response.json()) as Conversacion
}
