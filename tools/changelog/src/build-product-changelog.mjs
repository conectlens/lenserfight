/**
 * build-product-changelog.mjs — aggregate fragments into the Unreleased
 * section, and (via cutRelease) let a maintainer manually stamp that
 * aggregation into a dated version section. Cutting a release is a human
 * action (`pnpm changelog:cut`) — this module never runs unattended.
 */

const CATEGORY_HEADINGS = {
  feat: 'Added',
  fix: 'Fixed',
  security: 'Security',
  deprecation: 'Deprecated',
  breaking: 'Breaking Changes',
  perf: 'Performance',
  docs: 'Documentation',
}

// Docs-manager review order: security-relevant and breaking information first.
const CATEGORY_ORDER = ['breaking', 'security', 'feat', 'fix', 'perf', 'deprecation', 'docs']

/**
 * @param {object} input
 * @param {Map<number, object>} input.fragments - prNumber → fragment
 * @param {Array} input.commits - for date lookup by prNumber
 * @param {Set<number>} [input.releasedPrNumbers] - PRs already cut into a version section
 */
export function aggregateUnreleased({ fragments, commits, releasedPrNumbers = new Set() }) {
  const dateByPr = new Map()
  for (const c of commits) {
    if (c.prNumber != null && !dateByPr.has(c.prNumber)) dateByPr.set(c.prNumber, c.date)
  }

  const categories = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]))
  let totalCount = 0

  for (const fragment of fragments.values()) {
    if (fragment.category === 'internal') continue
    if (releasedPrNumbers.has(fragment.prNumber)) continue
    const bucket = categories[fragment.category]
    if (!bucket) continue // unknown category — schema validation should have already caught this
    bucket.push({ ...fragment, date: dateByPr.get(fragment.prNumber) ?? null })
    totalCount++
  }

  for (const bucket of Object.values(categories)) {
    bucket.sort((a, b) => {
      if (a.date && b.date) {
        const cmp = b.date.localeCompare(a.date)
        if (cmp !== 0) return cmp
      } else if (a.date !== b.date) {
        return a.date ? -1 : 1 // dated entries before undated ones
      }
      return b.prNumber - a.prNumber
    })
  }

  return { categories, totalCount }
}

function renderFragmentBullet(fragment) {
  const scope = `**${fragment.scope}**: `
  const migration = fragment.breaking && fragment.migration ? ` _Migration: ${fragment.migration}_` : ''
  return `- ${scope}${fragment.summary} ([#${fragment.prNumber}](https://github.com/conectlens/lenserfight/pull/${fragment.prNumber}))${migration}`
}

/** Render the Unreleased aggregation as a standalone markdown section body. */
export function renderUnreleasedSection(aggregated) {
  if (aggregated.totalCount === 0) return ''
  const parts = []
  for (const key of CATEGORY_ORDER) {
    const bucket = aggregated.categories[key]
    if (bucket.length === 0) continue
    parts.push(`### ${CATEGORY_HEADINGS[key]}\n`)
    parts.push(bucket.map(renderFragmentBullet).join('\n'))
    parts.push('')
  }
  return parts.join('\n').trim()
}

const CUT_MARKER = '<!-- changelog:cut-here -->'

/**
 * Stamp the current Unreleased aggregation into a new dated version section.
 * Insertion point, in priority order:
 *   1. Immediately after a `<!-- changelog:cut-here -->` marker comment
 *      (lets a page keep intro/Unreleased-explainer content above the
 *      version list without every cut landing below unrelated sections).
 *   2. Immediately before the first existing `## [` version heading.
 *   3. End of file, if this is the first release ever recorded.
 */
export function cutRelease(existingMarkdown, aggregated, { version, date }) {
  const body = renderUnreleasedSection(aggregated)
  const section = `## [${version}] - ${date}\n\n${body}\n`
  const releasedPrNumbers = CATEGORY_ORDER.flatMap((k) => aggregated.categories[k]).map((f) => f.prNumber)

  const markerIndex = existingMarkdown.indexOf(CUT_MARKER)
  if (markerIndex !== -1) {
    const insertAt = markerIndex + CUT_MARKER.length
    return {
      markdown:
        existingMarkdown.slice(0, insertAt) + '\n\n' + section + existingMarkdown.slice(insertAt).replace(/^\n+/, '\n'),
      releasedPrNumbers,
    }
  }

  const headingIndex = existingMarkdown.search(/^## \[/m)
  if (headingIndex === -1) {
    return { markdown: `${existingMarkdown.trimEnd()}\n\n${section}`, releasedPrNumbers }
  }
  return {
    markdown: existingMarkdown.slice(0, headingIndex) + section + '\n' + existingMarkdown.slice(headingIndex),
    releasedPrNumbers,
  }
}
