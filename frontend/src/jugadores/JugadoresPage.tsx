import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { isPosicion, PAGE_SIZE, type Posicion } from './api/jugadoresApi'
import { JugadorCard } from './components/JugadorCard'
import { JugadoresFilters } from './components/JugadoresFilters'
import { Pagination } from './components/Pagination'
import { useJugadores } from './hooks/useJugadores'

const SEARCH_DEBOUNCE_MS = 300

function parsePage(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

export function JugadoresPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const search = searchParams.get('search') ?? ''
  const rawPosicion = searchParams.get('posicion')
  const posicion: Posicion | '' = isPosicion(rawPosicion) ? rawPosicion : ''

  // The input is edited locally and committed to the URL after a pause.
  const [searchText, setSearchText] = useState(search)
  const [syncedSearch, setSyncedSearch] = useState(search)
  if (search !== syncedSearch) {
    // The URL changed from outside (back button): follow it.
    setSyncedSearch(search)
    setSearchText(search)
  }

  const updateParams = useCallback(
    (changes: { page?: number; search?: string; posicion?: Posicion | '' }) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        for (const [name, value] of Object.entries(changes)) {
          if (value && value !== 1) next.set(name, String(value))
          else next.delete(name)
        }
        // Any filter change goes back to the first page.
        if (!('page' in changes)) next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (searchText === search) return
    const timer = setTimeout(() => updateParams({ search: searchText }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchText, search, updateParams])

  const { data, status, retry } = useJugadores({ page, search, posicion })
  const query = searchParams.toString()
  const listSearch = query ? `?${query}` : ''

  return (
    <section className="jugadores-page">
      <h1>Jugadores</h1>
      <JugadoresFilters
        search={searchText}
        posicion={posicion}
        onSearchChange={setSearchText}
        onPosicionChange={(value) => updateParams({ posicion: value })}
      />

      {status === 'loading' && <p>Cargando jugadores...</p>}

      {status === 'error' && (
        <div role="alert">
          <p>No se pudieron cargar los jugadores.</p>
          <button type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'success' && data.results.length === 0 && (
        <p>No hay jugadores que coincidan con la búsqueda.</p>
      )}

      {status === 'success' && data.results.length > 0 && (
        <>
          <p>{data.count === 1 ? '1 jugador' : `${data.count} jugadores`}</p>
          <div className="jugadores-grid">
            {data.results.map((jugador) => (
              <JugadorCard key={jugador.id} jugador={jugador} listSearch={listSearch} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(data.count / PAGE_SIZE))}
            hasPrevious={data.previous !== null}
            hasNext={data.next !== null}
            onPageChange={(value) => updateParams({ page: value })}
          />
        </>
      )}
    </section>
  )
}
