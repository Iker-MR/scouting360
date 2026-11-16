import { useId, useState, type FormEvent } from 'react'
import type { OjeadorDatos } from '../api/ojeadoresApi'

interface OjeadorFormProps {
  /** Read once on mount; remount (e.g. with a `key`) to reset the form. */
  initialValues: OjeadorDatos
  onSubmit: (values: OjeadorDatos) => void
  submitting: boolean
  /** Server validation errors keyed by field name (DRF 400 body). */
  errors?: Record<string, string[]>
  submitLabel: string
}

type Field = keyof OjeadorDatos

const LABELS: Record<Field, string> = {
  nombre: 'Nombre',
  organizacion: 'Organización',
}

export function OjeadorForm({
  initialValues,
  onSubmit,
  submitting,
  errors = {},
  submitLabel,
}: OjeadorFormProps) {
  const [values, setValues] = useState(initialValues)
  // Unique per instance, so two forms on one page never share input ids.
  const idPrefix = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the browser from reloading the page; the container saves via the API.
    event.preventDefault()
    onSubmit(values)
  }

  function renderField(field: Field) {
    const inputId = `${idPrefix}-${field}`
    const errorId = `${inputId}-error`
    const fieldErrors = errors[field] ?? []
    const hasError = fieldErrors.length > 0
    return (
      <div key={field}>
        <label htmlFor={inputId}>{LABELS[field]}</label>
        <input
          id={inputId}
          type="text"
          value={values[field]}
          onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
          // Links the input to its error message so screen readers announce it.
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
        />
        {hasError && (
          <p id={errorId} className="ojeador-form__error">
            {fieldErrors.join(' ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <form className="ojeador-form" onSubmit={handleSubmit} noValidate>
      {renderField('nombre')}
      {renderField('organizacion')}
      <button type="submit" disabled={submitting}>
        {submitLabel}
      </button>
    </form>
  )
}
