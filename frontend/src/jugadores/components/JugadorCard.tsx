import { Link } from 'react-router'
import type { Jugador } from '../api/jugadoresApi'
import { initials } from './initials'

interface JugadorCardProps {
  jugador: Jugador
  // Current list query string; the detail page uses it to return to the same filtered list.
  listSearch?: string
}

export function JugadorCard({ jugador, listSearch = '' }: JugadorCardProps) {
  return (
    <article className="jugador-card">
      {jugador.foto ? (
        <img className="jugador-card__foto" src={jugador.foto} alt={jugador.nombre} />
      ) : (
        <div className="jugador-card__foto jugador-card__foto--placeholder" aria-hidden="true">
          {initials(jugador.nombre)}
        </div>
      )}
      <div className="jugador-card__body">
        <h2>
          <Link to={`/jugadores/${jugador.id}`} state={{ listSearch }}>
            {jugador.nombre}
          </Link>
        </h2>
        <p>{jugador.posicion_display}</p>
        <p>{jugador.zona}</p>
        <p>{jugador.club_actual || 'Sin club'}</p>
        <span
          className={`badge ${jugador.disponible ? 'badge--ok' : 'badge--off'}`}
        >
          {jugador.disponible ? 'Disponible' : 'No disponible'}
        </span>
      </div>
    </article>
  )
}
