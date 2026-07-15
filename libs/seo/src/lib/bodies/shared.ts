import { escapeAttr, escapeHtml } from '../html'

/** An internal link emitted in the crawlable body so bots can walk the graph. */
export interface EntityLink {
  href: string
  label: string
}

/** A labelled fact rendered into the body's definition list. */
export interface EntityFact {
  label: string
  value: string
}

export interface EntityBodyInput {
  /** Primary heading — the entity title/name. */
  h1: string
  /** One-paragraph human summary. */
  summary: string
  /** Key/value facts (author, model, tags, counts, dates). */
  facts?: EntityFact[]
  /** Internal links to related entities (author, tags, parents, contenders). */
  links?: EntityLink[]
  /** Optional extra prose sections (e.g. top public comments). */
  sections?: Array<{ heading: string; html: string }>
}

/**
 * Render a crawlable entity body shared by every entity type. Escapes all
 * caller-supplied text; `sections[].html` is trusted (callers pass already-safe
 * markup). Pure — no DOM, safe in the Worker.
 */
export function renderEntityBody(input: EntityBodyInput): string {
  const { h1, summary, facts = [], links = [], sections = [] } = input

  const factsHtml = facts.length
    ? `<dl>${facts
        .map((f) => `<dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd>`)
        .join('')}</dl>`
    : ''

  const linksHtml = links.length
    ? `<nav aria-label="Related"><ul>${links
        .map((l) => `<li><a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a></li>`)
        .join('')}</ul></nav>`
    : ''

  const sectionsHtml = sections
    .map((s) => `<section><h2>${escapeHtml(s.heading)}</h2>${s.html}</section>`)
    .join('')

  return `<main><article>
<h1>${escapeHtml(h1)}</h1>
<p>${escapeHtml(summary)}</p>
${factsHtml}
${linksHtml}
${sectionsHtml}
</article></main>`
}

/** Absolute community (apps/web) canonical host. */
export const FORUM_HOST = 'https://moon.lenserfight.com'
/** Absolute arena (apps/arena) canonical host. */
export const ARENA_HOST = 'https://lenserfight.com'
