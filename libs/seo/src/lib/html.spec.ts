import { describe, expect, it } from 'vitest'
import { escapeAttr, escapeHtml, serializeJsonLd } from './html'

describe('escapeHtml', () => {
  it('escapes &, <, >, " and \'', () => {
    expect(escapeHtml('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;')
  })

  it('escapes & before other entities (no double-escaping)', () => {
    expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c')
  })

  it('is a no-op for safe text', () => {
    expect(escapeHtml('AI Agent Planner')).toBe('AI Agent Planner')
  })
})

describe('escapeAttr', () => {
  it('escapes double quotes for attribute context', () => {
    expect(escapeAttr('say "hi"')).toBe('say &quot;hi&quot;')
  })
})

describe('serializeJsonLd', () => {
  it('escapes < so a </script> in content cannot break out', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).toContain('\\u003c/script')
  })

  it('produces valid JSON for a typical CreativeWork', () => {
    const out = serializeJsonLd({ '@type': 'CreativeWork', name: 'Lens' })
    expect(JSON.parse(out)).toEqual({ '@type': 'CreativeWork', name: 'Lens' })
  })
})
