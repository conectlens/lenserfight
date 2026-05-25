/**
 * Strips null bytes, double-brace template injection patterns {{ }},
 * and trims the string to at most 10 000 characters.
 */
export function sanitizeStringInput(value: string): string {
  return value
    .replace(/\0/g, '')
    .replace(/\{\{.*?\}\}/gs, '')
    .slice(0, 10_000)
}
