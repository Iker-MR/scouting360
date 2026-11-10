import type { Jugador } from '../api/jugadoresApi'

function initials(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

export function JugadorCard({ jugador }: { jugador: Jugador }) {
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
        <h2>{jugador.nombre}</h2>
        <p>{jugador.posicion_display}</p>
        <p className="jugador-card__overall">{jugador.overall ?? '—'}</p>
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
