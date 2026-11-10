import type { Atributos, Jugador } from '../api/jugadoresApi'
import { calcularEdad } from '../utils/calcularEdad'
import { initials } from './initials'

const ATRIBUTOS: Array<[keyof Atributos, string]> = [
  ['ritmo', 'Ritmo'],
  ['tiro', 'Tiro'],
  ['pase', 'Pase'],
  ['regate', 'Regate'],
  ['defensa', 'Defensa'],
  ['fisico', 'Físico'],
]

const PIERNAS = { D: 'Derecha', I: 'Zurda' } as const

export function JugadorDetail({ jugador }: { jugador: Jugador }) {
  const edad = calcularEdad(jugador.fecha_nacimiento)
  const { atributos } = jugador

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
        </div>
      </header>

      <dl className="jugador-detail__datos">
        <div>
          <dt>Overall</dt>
          <dd className="jugador-detail__overall">{jugador.overall ?? '—'}</dd>
        </div>
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

      <section>
        <h2>Atributos</h2>
        {atributos ? (
          <ul className="atributos">
            {ATRIBUTOS.map(([name, label]) => (
              <li key={name}>
                <label htmlFor={`atributo-${name}`}>{label}</label>
                <meter
                  id={`atributo-${name}`}
                  min={0}
                  max={99}
                  value={atributos[name]}
                  aria-valuemin={0}
                  aria-valuemax={99}
                  aria-valuenow={atributos[name]}
                />
                <span aria-hidden="true">{atributos[name]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Este jugador todavía no tiene atributos.</p>
        )}
      </section>
    </article>
  )
}
