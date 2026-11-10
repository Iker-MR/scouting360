import { calcularEdad } from './calcularEdad'

describe('calcularEdad', () => {
  it('cuenta los años cumplidos', () => {
    expect(calcularEdad('2005-04-12', new Date(2026, 5, 1))).toBe(21)
  })

  it('el día antes del cumpleaños aún no ha cumplido', () => {
    expect(calcularEdad('2005-04-12', new Date(2026, 3, 11))).toBe(20)
  })

  it('el día del cumpleaños ya ha cumplido', () => {
    expect(calcularEdad('2005-04-12', new Date(2026, 3, 12))).toBe(21)
  })

  it('el día después del cumpleaños ha cumplido', () => {
    expect(calcularEdad('2005-04-12', new Date(2026, 3, 13))).toBe(21)
  })

  it('un mes posterior pero día anterior no ha cumplido', () => {
    expect(calcularEdad('2005-04-20', new Date(2026, 4, 10))).toBe(21)
    expect(calcularEdad('2005-12-31', new Date(2026, 0, 1))).toBe(20)
  })

  it('trata el 29 de febrero como cumpleaños el 1 de marzo en años no bisiestos', () => {
    expect(calcularEdad('2004-02-29', new Date(2025, 1, 28))).toBe(20)
    expect(calcularEdad('2004-02-29', new Date(2025, 2, 1))).toBe(21)
  })

  it('usa la fecha actual por defecto', () => {
    expect(calcularEdad('2000-01-01')).toBeGreaterThanOrEqual(26)
  })
})
