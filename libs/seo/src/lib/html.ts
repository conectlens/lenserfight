// Pure HTML/JSON-LD escaping helpers. Every entity-derived string interpolated
// into a bot HTML document or an XML sitemap MUST pass through these — user
// content (lens titles, thread bodies, handles) is untrusted.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes text for HTML element context (`&`, `<`, `>`, `"`, `'`). */
export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

/**
 * Escapes text for a double-quoted HTML attribute value. Same replacements as
 * {@link escapeHtml}; kept as a distinct function so attribute-context call
 * sites read clearly and can diverge later if needed.
 */
export function escapeAttr(value: string): string {
  return escapeHtml(value)
}

/**
 * Serializes an object to a JSON-LD string safe to embed inside a
 * `<script type="application/ld+json">` block. `<` is escaped to its unicode
 * form so a `</script>` sequence in user content cannot break out of the tag.
 */
export function serializeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}
