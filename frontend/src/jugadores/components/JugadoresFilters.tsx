import { POSICIONES, type Posicion } from '../api/jugadoresApi'

interface JugadoresFiltersProps {
  search: string
  posicion: Posicion | ''
  onSearchChange: (search: string) => void
  onPosicionChange: (posicion: Posicion | '') => void
}

export function JugadoresFilters({
  search,
  posicion,
  onSearchChange,
  onPosicionChange,
}: JugadoresFiltersProps) {
  return (
    <div className="jugadores-filters">
      <div>
        <label htmlFor="jugadores-search">Buscar</label>
        <input
          id="jugadores-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="jugadores-posicion">Posición</label>
        <select
          id="jugadores-posicion"
          value={posicion}
          onChange={(event) => onPosicionChange(event.target.value as Posicion | '')}
        >
          <option value="">Todas</option>
          {Object.entries(POSICIONES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
