/**
 * Allowlist-based SVG sanitizer for untrusted submission content.
 *
 * Voting surfaces render opponent drawings inline via `dangerouslySetInnerHTML`
 * so that vector strokes scale without quality loss. Raw SVG accepts JavaScript
 * (`<script>`, `on*` handlers, `javascript:` URLs, `<foreignObject>` with
 * embedded HTML, `<use href="...">` cross-origin loads), which would create a
 * stored-XSS vector reaching every voter.
 *
 * This sanitizer parses the SVG with the browser's `DOMParser`, walks the
 * resulting tree, and drops any element or attribute that isn't on the
 * allowlist below. Attribute values that look like script URLs are rejected.
 *
 * The allowlist is intentionally narrow — drawing submissions only need shape
 * primitives, paths, groups, and basic presentation attributes. Extend with
 * care; every new tag or attribute is a new attack surface.
 */

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'title',
  'desc',
])

const ALLOWED_ATTRS = new Set([
  'xmlns',
  'viewbox',
  'width',
  'height',
  'preserveaspectratio',
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'transform',
  'id',
  'class',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientunits',
  'gradienttransform',
])

const URL_VALUED_ATTRS = new Set(['fill', 'stroke'])
const SAFE_URL_REF = /^url\(#[A-Za-z_][\w-]*\)$/

function isAttributeSafe(name: string, value: string): boolean {
  const lower = name.toLowerCase()
  if (!ALLOWED_ATTRS.has(lower)) return false
  if (lower.startsWith('on')) return false
  if (URL_VALUED_ATTRS.has(lower) && value.includes('url(')) {
    return SAFE_URL_REF.test(value.trim())
  }
  const trimmed = value.trim().toLowerCase()
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return false
  return true
}

function sanitizeNode(node: Element): Element | null {
  const tag = node.tagName.toLowerCase()
  if (!ALLOWED_TAGS.has(tag)) return null

  for (const attr of Array.from(node.attributes)) {
    if (!isAttributeSafe(attr.name, attr.value)) {
      node.removeAttribute(attr.name)
    }
  }

  for (const child of Array.from(node.children)) {
    if (sanitizeNode(child) === null) {
      child.remove()
    }
  }

  return node
}

/**
 * Returns sanitized SVG markup, or an empty string if the input is not a
 * parseable SVG document or the root element is not `<svg>`.
 */
export function sanitizeSvg(input: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return ''
  const trimmed = input.trim()
  if (!trimmed.startsWith('<svg')) return ''

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
  } catch {
    return ''
  }

  if (doc.querySelector('parsererror')) return ''
  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg') return ''

  const sanitizedRoot = sanitizeNode(root)
  if (!sanitizedRoot) return ''

  return new XMLSerializer().serializeToString(sanitizedRoot)
}
