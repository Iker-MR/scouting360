// Age in completed years. `fechaNacimiento` is an ISO date ('YYYY-MM-DD');
// it is parsed by hand so the result never depends on the time zone.
export function calcularEdad(fechaNacimiento: string, hoy: Date = new Date()): number {
  const [year, month, day] = fechaNacimiento.split('-').map(Number)
  let edad = hoy.getFullYear() - year
  const todayMonth = hoy.getMonth() + 1
  if (todayMonth < month || (todayMonth === month && hoy.getDate() < day)) edad -= 1
  return edad
}
