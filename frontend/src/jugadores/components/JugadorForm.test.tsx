import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JugadorForm, type JugadorFormValues } from './JugadorForm'

const valores: JugadorFormValues = {
  nombre: 'Ana Ruiz',
  fecha_nacimiento: '2005-04-12',
  posicion: 'MC',
  pierna_dominante: 'I',
  zona: 'Madrid',
  club_actual: 'CD Ejemplo',
  disponible: true,
  bio: 'Mediocentro creativo.',
}

function renderForm(props: Partial<Parameters<typeof JugadorForm>[0]> = {}) {
  const onSubmit = vi.fn()
  render(
    <JugadorForm initialValues={valores} onSubmit={onSubmit} submitting={false} {...props} />,
  )
  return { onSubmit }
}

describe('JugadorForm', () => {
  it('muestra los datos actuales del jugador en el formulario', () => {
    renderForm()

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Ruiz')
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue('2005-04-12')
    expect(screen.getByLabelText('Posición')).toHaveValue('MC')
    expect(screen.getByLabelText('Pierna dominante')).toHaveValue('I')
    expect(screen.getByLabelText('Zona')).toHaveValue('Madrid')
    expect(screen.getByLabelText('Club actual')).toHaveValue('CD Ejemplo')
    expect(screen.getByLabelText('Disponible')).toBeChecked()
    expect(screen.getByLabelText('Biografía')).toHaveValue('Mediocentro creativo.')
  })

  it('envía los valores editados al guardar', async () => {
    const { onSubmit } = renderForm()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Ana María Ruiz')
    await user.selectOptions(screen.getByLabelText('Posición'), 'DL')
    await user.click(screen.getByLabelText('Disponible'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      ...valores,
      nombre: 'Ana María Ruiz',
      posicion: 'DL',
      disponible: false,
    })
  })

  it('muestra los errores de cada campo', () => {
    renderForm({ errors: { nombre: ['Este campo no puede estar en blanco.'] } })

    const nombre = screen.getByLabelText('Nombre')
    expect(nombre).toHaveAccessibleDescription('Este campo no puede estar en blanco.')
    expect(nombre).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Zona')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('deshabilita el botón mientras se guarda', () => {
    renderForm({ submitting: true })

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
  })

  it('muestra el texto del botón recibido por props', () => {
    renderForm({ submitLabel: 'Crear perfil' })

    expect(screen.getByRole('button', { name: 'Crear perfil' })).toBeEnabled()
  })

  it('permite empezar sin posición ni pierna elegidas', async () => {
    const { onSubmit } = renderForm({
      initialValues: { ...valores, posicion: '', pierna_dominante: '' },
    })
    const user = userEvent.setup()

    expect(screen.getByLabelText('Posición')).toHaveDisplayValue('Selecciona una posición')
    expect(screen.getByLabelText('Pierna dominante')).toHaveDisplayValue('Selecciona una pierna')
    // Once something is picked, the placeholder cannot be chosen again.
    expect(screen.getByRole('option', { name: 'Selecciona una posición' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    // Sent as is: the server rejects '' with a 400 that the form then shows.
    expect(onSubmit).toHaveBeenCalledWith({ ...valores, posicion: '', pierna_dominante: '' })
  })
})
