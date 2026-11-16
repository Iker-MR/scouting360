import { Link } from 'react-router'
import type { ConversacionResumen, RolAutor } from '../api/conversacionesApi'

interface ConversacionListProps {
  conversaciones: ConversacionResumen[]
  /** The viewer's role: each entry shows the other side of the conversation. */
  miRol: RolAutor
}

export function ConversacionList({ conversaciones, miRol }: ConversacionListProps) {
  return (
    <ul className="conversacion-list" aria-label="Conversaciones">
      {conversaciones.map((conversacion) => (
        <li key={conversacion.id}>
          <Link to={`/conversaciones/${conversacion.id}`}>
            {miRol === 'ojeador' ? conversacion.jugador_nombre : conversacion.ojeador_nombre}
          </Link>
        </li>
      ))}
    </ul>
  )
}
