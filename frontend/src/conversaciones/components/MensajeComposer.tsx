import { useState, type FormEvent } from 'react'

interface MensajeComposerProps {
  /** Resolves true when the message was sent, so the field can be cleared. */
  onEnviar: (texto: string) => Promise<boolean>
  errores?: string[]
}

export function MensajeComposer({ onEnviar, errores = [] }: MensajeComposerProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const vacio = texto.trim() === ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (vacio || enviando) return
    setEnviando(true)
    const enviado = await onEnviar(texto.trim())
    setEnviando(false)
    // On failure the text stays, so the user does not have to type it again.
    if (enviado) setTexto('')
  }

  return (
    <form className="mensaje-composer" onSubmit={handleSubmit}>
      <label htmlFor="mensaje-texto">Tu mensaje</label>
      <textarea
        id="mensaje-texto"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        // Links the field to its error message so screen readers announce it.
        aria-describedby={errores.length > 0 ? 'mensaje-texto-error' : undefined}
      />
      {errores.length > 0 && (
        <p id="mensaje-texto-error" className="mensaje-composer__error">
          {errores.join(' ')}
        </p>
      )}
      <button type="submit" disabled={vacio || enviando}>
        Enviar
      </button>
    </form>
  )
}
