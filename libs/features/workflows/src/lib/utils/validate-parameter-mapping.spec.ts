import { describe, expect, it } from 'vitest'

import { validateParameterMapping } from './validate-parameter-mapping'

describe('validateParameterMapping', () => {
  // ── text / textarea inputs ───────────────────────────────────────────────

  describe('text input', () => {
    it('text → text is compatible', () => {
      expect(validateParameterMapping('text', 'text')).toBe('compatible')
    })
    it('text → textarea is compatible', () => {
      expect(validateParameterMapping('text', 'textarea')).toBe('compatible')
    })
    it('number → text is compatible (safe coercion)', () => {
      expect(validateParameterMapping('number', 'text')).toBe('compatible')
    })
    it('boolean → text is compatible (safe coercion)', () => {
      expect(validateParameterMapping('boolean', 'text')).toBe('compatible')
    })
    it('json → text is warning (will stringify)', () => {
      expect(validateParameterMapping('json', 'text')).toBe('warning')
    })
    it('image → text is warning (gives URL)', () => {
      expect(validateParameterMapping('image', 'text')).toBe('warning')
    })
    it('video → text is warning (gives URL)', () => {
      expect(validateParameterMapping('video', 'text')).toBe('warning')
    })
    it('audio → text is warning (gives URL)', () => {
      expect(validateParameterMapping('audio', 'text')).toBe('warning')
    })
    it('embedding → text is incompatible (numeric vector)', () => {
      expect(validateParameterMapping('embedding', 'text')).toBe('incompatible')
    })
    it('void → text is incompatible', () => {
      expect(validateParameterMapping('void', 'text')).toBe('incompatible')
    })
    it('lens_result → text is warning (complex object)', () => {
      expect(validateParameterMapping('lens_result', 'text')).toBe('warning')
    })
    it('battle_result → text is warning', () => {
      expect(validateParameterMapping('battle_result', 'text')).toBe('warning')
    })
  })

  // ── code / json inputs ───────────────────────────────────────────────────

  describe('json input', () => {
    it('json → json is compatible', () => {
      expect(validateParameterMapping('json', 'json')).toBe('compatible')
    })
    it('json → code is compatible', () => {
      expect(validateParameterMapping('json', 'code')).toBe('compatible')
    })
    it('array → json is compatible', () => {
      expect(validateParameterMapping('array', 'json')).toBe('compatible')
    })
    it('lens_result → json is compatible', () => {
      expect(validateParameterMapping('lens_result', 'json')).toBe('compatible')
    })
    it('battle_result → json is compatible', () => {
      expect(validateParameterMapping('battle_result', 'json')).toBe('compatible')
    })
    it('text → json is warning', () => {
      expect(validateParameterMapping('text', 'json')).toBe('warning')
    })
    it('image → json is warning', () => {
      expect(validateParameterMapping('image', 'json')).toBe('warning')
    })
    it('embedding → json is warning (valid array but large)', () => {
      expect(validateParameterMapping('embedding', 'json')).toBe('warning')
    })
    it('void → json is incompatible', () => {
      expect(validateParameterMapping('void', 'json')).toBe('incompatible')
    })
  })

  // ── number input ─────────────────────────────────────────────────────────

  describe('number input', () => {
    it('number → number is compatible', () => {
      expect(validateParameterMapping('number', 'number')).toBe('compatible')
    })
    it('text → number is warning (may parse as NaN)', () => {
      expect(validateParameterMapping('text', 'number')).toBe('warning')
    })
    it('json → number is incompatible', () => {
      expect(validateParameterMapping('json', 'number')).toBe('incompatible')
    })
    it('image → number is incompatible', () => {
      expect(validateParameterMapping('image', 'number')).toBe('incompatible')
    })
    it('embedding → number is incompatible', () => {
      expect(validateParameterMapping('embedding', 'number')).toBe('incompatible')
    })
  })

  // ── boolean input ─────────────────────────────────────────────────────────

  describe('boolean input', () => {
    it('boolean → boolean is compatible', () => {
      expect(validateParameterMapping('boolean', 'boolean')).toBe('compatible')
    })
    it('text → boolean is warning (truthy coercion)', () => {
      expect(validateParameterMapping('text', 'boolean')).toBe('warning')
    })
    it('number → boolean is warning (truthy coercion)', () => {
      expect(validateParameterMapping('number', 'boolean')).toBe('warning')
    })
    it('json → boolean is incompatible', () => {
      expect(validateParameterMapping('json', 'boolean')).toBe('incompatible')
    })
  })

  // ── any output type ──────────────────────────────────────────────────────

  describe('any output type', () => {
    it('any → text is always warning (cannot determine safety statically)', () => {
      expect(validateParameterMapping('any', 'text')).toBe('warning')
    })
    it('any → json is warning', () => {
      expect(validateParameterMapping('any', 'json')).toBe('warning')
    })
    it('any → number is warning', () => {
      expect(validateParameterMapping('any', 'number')).toBe('warning')
    })
  })

  // ── select / datetime ────────────────────────────────────────────────────

  describe('select input', () => {
    it('text → select is compatible', () => {
      expect(validateParameterMapping('text', 'select')).toBe('compatible')
    })
    it('json → select is warning', () => {
      expect(validateParameterMapping('json', 'select')).toBe('warning')
    })
  })

  describe('datetime input', () => {
    it('text → datetime is compatible', () => {
      expect(validateParameterMapping('text', 'datetime')).toBe('compatible')
    })
    it('number → datetime is warning', () => {
      expect(validateParameterMapping('number', 'datetime')).toBe('warning')
    })
  })
})
