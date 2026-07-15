/**
 * Framework-free HTML/JSON-LD escaping helpers.
 *
 * These run in the Cloudflare Worker (no DOM) and in tests, so they must not
 * depend on `document`, `DOMParser`, or any browser global. Every string that
 * originates from user content MUST pass through one of these before being
 * interpolated into a rendered document.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape text-node content (`& < > " '`). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c)
}

/**
 * Escape a value destined for a double-quoted attribute. Identical rules to
 * {@link escapeHtml}; kept as a distinct name so call sites document intent.
 */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value)
}

/**
 * Serialize an object as JSON-LD safe for embedding inside a
 * `<script type="application/ld+json">` block. Escapes `<`, `>` and `&` so a
 * value such as `"</script>"` cannot break out of the element.
 */
export function serializeJsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
