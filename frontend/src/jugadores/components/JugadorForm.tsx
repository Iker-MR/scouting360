import { useId, useState, type FormEvent } from 'react'
import {
  PIERNAS,
  POSICIONES,
  type JugadorCambios,
  type PiernaDominante,
  type Posicion,
} from '../api/jugadoresApi'

export type JugadorFormValues = Required<JugadorCambios>

interface JugadorFormProps {
  /** Read once on mount; remount (e.g. with a `key`) to reset the form. */
  initialValues: JugadorFormValues
  onSubmit: (values: JugadorFormValues) => void
  submitting: boolean
  /** Server validation errors keyed by field name (DRF 400 body). */
  errors?: Record<string, string[]>
}

type Field = keyof JugadorFormValues

export function JugadorForm({
  initialValues,
  onSubmit,
  submitting,
  errors = {},
}: JugadorFormProps) {
  const [values, setValues] = useState(initialValues)
  // Unique per instance, so two forms on one page never share input ids.
  const idPrefix = useId()

  function set<K extends Field>(field: K, value: JugadorFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const inputId = (field: Field) => `${idPrefix}-${field}`
  const errorId = (field: Field) => `${idPrefix}-${field}-error`
  const hasError = (field: Field) => (errors[field]?.length ?? 0) > 0

  // Links the input to its error message so screen readers announce it.
  function a11y(field: Field) {
    return {
      id: inputId(field),
      'aria-invalid': hasError(field) || undefined,
      'aria-describedby': hasError(field) ? errorId(field) : undefined,
    }
  }

  function fieldError(field: Field) {
    if (!hasError(field)) return null
    return (
      <p id={errorId(field)} className="jugador-form__error">
        {errors[field].join(' ')}
      </p>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the browser from reloading the page; the container saves via the API.
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form className="jugador-form" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor={inputId('nombre')}>Nombre</label>
        <input
          {...a11y('nombre')}
          type="text"
          value={values.nombre}
          onChange={(event) => set('nombre', event.target.value)}
        />
        {fieldError('nombre')}
      </div>

      <div>
        <label htmlFor={inputId('fecha_nacimiento')}>Fecha de nacimiento</label>
        <input
          {...a11y('fecha_nacimiento')}
          type="date"
          value={values.fecha_nacimiento}
          onChange={(event) => set('fecha_nacimiento', event.target.value)}
        />
        {fieldError('fecha_nacimiento')}
      </div>

      <div>
        <label htmlFor={inputId('posicion')}>Posición</label>
        <select
          {...a11y('posicion')}
          value={values.posicion}
          onChange={(event) => set('posicion', event.target.value as Posicion)}
        >
          {Object.entries(POSICIONES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldError('posicion')}
      </div>

      <div>
        <label htmlFor={inputId('pierna_dominante')}>Pierna dominante</label>
        <select
          {...a11y('pierna_dominante')}
          value={values.pierna_dominante}
          onChange={(event) => set('pierna_dominante', event.target.value as PiernaDominante)}
        >
          {Object.entries(PIERNAS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldError('pierna_dominante')}
      </div>

      <div>
        <label htmlFor={inputId('zona')}>Zona</label>
        <input
          {...a11y('zona')}
          type="text"
          value={values.zona}
          onChange={(event) => set('zona', event.target.value)}
        />
        {fieldError('zona')}
      </div>

      <div>
        <label htmlFor={inputId('club_actual')}>Club actual</label>
        <input
          {...a11y('club_actual')}
          type="text"
          value={values.club_actual}
          onChange={(event) => set('club_actual', event.target.value)}
        />
        {fieldError('club_actual')}
      </div>

      <div className="jugador-form__checkbox">
        <input
          {...a11y('disponible')}
          type="checkbox"
          checked={values.disponible}
          onChange={(event) => set('disponible', event.target.checked)}
        />
        <label htmlFor={inputId('disponible')}>Disponible</label>
        {fieldError('disponible')}
      </div>

      <div>
        <label htmlFor={inputId('bio')}>Biografía</label>
        <textarea
          {...a11y('bio')}
          rows={4}
          value={values.bio}
          onChange={(event) => set('bio', event.target.value)}
        />
        {fieldError('bio')}
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
