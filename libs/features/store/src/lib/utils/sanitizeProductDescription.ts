const ALLOWED_TAGS = new Set(['p', 'strong', 'em', 'br'])
const DROP_CONTENT_TAGS = new Set(['script', 'style', 'template', 'noscript'])

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()

  if (DROP_CONTENT_TAGS.has(tag)) {
    return ''
  }

  const children = Array.from(element.childNodes).map(sanitizeNode).join('')

  if (!ALLOWED_TAGS.has(tag)) {
    return children
  }

  if (tag === 'br') {
    return '<br />'
  }

  return `<${tag}>${children}</${tag}>`
}

export function sanitizeProductDescription(html: string): string {
  if (!html) return ''

  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  return Array.from(document.body.childNodes)
    .map(sanitizeNode)
    .join('')
    .trim()
}
