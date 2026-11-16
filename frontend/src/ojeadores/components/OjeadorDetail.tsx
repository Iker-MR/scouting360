import type { Ojeador } from '../api/ojeadoresApi'

interface OjeadorDetailProps {
  ojeador: Ojeador
  /** The owner also gets an explanation while the profile is pending. */
  isOwner: boolean
}

export function OjeadorDetail({ ojeador, isOwner }: OjeadorDetailProps) {
  return (
    <article className="ojeador-detail">
      <h1>{ojeador.nombre}</h1>
      <p>{ojeador.organizacion || 'Sin organización'}</p>
      {ojeador.verificado ? (
        <p className="ojeador-detail__badge ojeador-detail__badge--verified">Verificado</p>
      ) : (
        <>
          <p className="ojeador-detail__badge ojeador-detail__badge--pending">
            Pendiente de verificación
          </p>
          {isOwner && <p>Revisaremos tu perfil y te verificaremos en breve.</p>}
        </>
      )}
    </article>
  )
}
