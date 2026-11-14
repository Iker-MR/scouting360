import { Link } from 'react-router'
import { PIERNAS, type Jugador } from '../api/jugadoresApi'
import { calcularEdad } from '../utils/calcularEdad'
import { initials } from './initials'

interface JugadorDetailProps {
  jugador: Jugador
  /** When set, shows an "Editar perfil" link to this path. */
  editPath?: string
}

export function JugadorDetail({ jugador, editPath }: JugadorDetailProps) {
  const edad = calcularEdad(jugador.fecha_nacimiento)

  return (
    <article className="jugador-detail">
      <header className="jugador-detail__header">
        {jugador.foto ? (
          <img className="jugador-detail__foto" src={jugador.foto} alt={jugador.nombre} />
        ) : (
          <div
            className="jugador-detail__foto jugador-detail__foto--placeholder"
            aria-hidden="true"
          >
            {initials(jugador.nombre)}
          </div>
        )}
        <div className="jugador-detail__summary">
          <h1>{jugador.nombre}</h1>
          <p>{jugador.posicion_display}</p>
          <span className={`badge ${jugador.disponible ? 'badge--ok' : 'badge--off'}`}>
            {jugador.disponible ? 'Disponible' : 'No disponible'}
          </span>
          {editPath && (
            <Link className="jugador-detail__edit" to={editPath}>
              Editar perfil
            </Link>
          )}
        </div>
      </header>

      <dl className="jugador-detail__datos">
        <div>
          <dt>Edad</dt>
          <dd>{edad === 1 ? '1 año' : `${edad} años`}</dd>
        </div>
        <div>
          <dt>Pierna dominante</dt>
          <dd>{PIERNAS[jugador.pierna_dominante]}</dd>
        </div>
        <div>
          <dt>Zona</dt>
          <dd>{jugador.zona}</dd>
        </div>
        <div>
          <dt>Club</dt>
          <dd>{jugador.club_actual || 'Sin club'}</dd>
        </div>
      </dl>

      {jugador.bio && (
        <section>
          <h2>Biografía</h2>
          <p>{jugador.bio}</p>
        </section>
      )}
    </article>
  )
}
