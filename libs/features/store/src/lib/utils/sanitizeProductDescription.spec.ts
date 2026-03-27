import { describe, expect, it } from 'vitest'

import { sanitizeProductDescription } from './sanitizeProductDescription'

describe('sanitizeProductDescription', () => {
  it('keeps simple formatting while stripping attributes and unsafe tags', () => {
    const result = sanitizeProductDescription(`
      <p style="color:red" onclick="alert(1)">Safe <strong>bold</strong></p>
      <img src="x" onerror="alert(1)" />
      <a href="javascript:alert(1)">click</a>
      <script>alert('xss')</script>
    `)

    expect(result).toContain('<p>Safe <strong>bold</strong></p>')
    expect(result).toContain('click')
    expect(result).not.toContain('style=')
    expect(result).not.toContain('onclick=')
    expect(result).not.toContain('onerror=')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('<script>')
  })
})
