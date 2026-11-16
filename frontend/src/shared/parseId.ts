/** Route param to a numeric id; null when it is missing or not all digits. */
export function parseId(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : null
}
