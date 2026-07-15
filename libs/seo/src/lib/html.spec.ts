import { describe, expect, it } from 'vitest'
import { escapeAttr, escapeHtml, serializeJsonLd } from './html'

describe('escapeHtml', () => {
  it('escapes the five significant HTML characters', () => {
    expect(escapeHtml(`<b>&"'`)).toBe('&lt;b&gt;&amp;&quot;&#39;')
  })

  it('coerces null/undefined to an empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('leaves safe text untouched', () => {
    expect(escapeHtml('Planning Lens 2026')).toBe('Planning Lens 2026')
  })
})

describe('escapeAttr', () => {
  it('escapes double quotes so attributes cannot break out', () => {
    expect(escapeAttr('a" onload="x')).toBe('a&quot; onload=&quot;x')
  })
})

describe('serializeJsonLd', () => {
  it('escapes a </script> breakout attempt', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).toContain('\\u003c')
  })

  it('produces valid JSON once unescaped', () => {
    const out = serializeJsonLd({ '@type': 'CreativeWork', name: 'x' })
    const roundTrip = JSON.parse(
      out.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&'),
    )
    expect(roundTrip['@type']).toBe('CreativeWork')
  })
})
