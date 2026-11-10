interface PaginationProps {
  page: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
}: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" disabled={!hasPrevious} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
