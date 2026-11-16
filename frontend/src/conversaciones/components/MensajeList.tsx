import type { Mensaje, RolAutor } from '../api/conversacionesApi'

const ETIQUETA_ROL: Record<RolAutor, string> = { ojeador: 'Ojeador', jugador: 'Jugador' }

interface MensajeListProps {
  mensajes: Mensaje[]
  /** The viewer's role in this conversation: their own messages read "Vos". */
  miRol: RolAutor
}

export function MensajeList({ mensajes, miRol }: MensajeListProps) {
  return (
    <ol className="mensaje-list" aria-label="Mensajes">
      {mensajes.map((mensaje) => {
        const esMio = mensaje.autor === miRol
        return (
          <li key={mensaje.id} className={esMio ? 'mensaje mensaje--mio' : 'mensaje'}>
            <span className="mensaje__autor">{esMio ? 'Vos' : ETIQUETA_ROL[mensaje.autor]}</span>
            <p className="mensaje__texto">{mensaje.texto}</p>
          </li>
        )
      })}
    </ol>
  )
}
