/**
 * localize.mjs — decide whether a Turkish rendering of an entry is a real
 * translation or an honest English fallback.
 *
 * Mirrors the TR_GATE pattern already used in docs/tr/index.md: never present
 * untranslated content as if it were translated.
 */

/**
 * @param {{ summary: string, userImpact: string }} enEntry
 * @param {Map<string, {summary: string, userImpact: string}> | undefined} trTranslations
 *   keyed by the same identifier used to look up enEntry (e.g. PR number or sha)
 * @param {string} key
 * @returns {{ status: 'translated' | 'fallback-en', summary: string, userImpact: string }}
 */
export function resolveLocalizedEntry(enEntry, trTranslations, key) {
  const tr = trTranslations?.get(key)
  if (tr && tr.summary && tr.userImpact) {
    return { status: 'translated', summary: tr.summary, userImpact: tr.userImpact }
  }
  return { status: 'fallback-en', summary: enEntry.summary, userImpact: enEntry.userImpact }
}
