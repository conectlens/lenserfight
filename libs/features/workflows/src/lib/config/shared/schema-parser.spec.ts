import { describe, expect, it } from 'vitest'

import {
  deserializeSchemaFields,
  jsonSchemaToFields,
  schemaFieldsToJsonSchema,
  serializeSchemaFields,
  validateSchemaFields,
} from './schema-parser'

import type { SchemaFieldEntry } from '../../types'

describe('schema-parser', () => {
  // ── schemaFieldsToJsonSchema ─────────────────────────────────────────────

  describe('schemaFieldsToJsonSchema', () => {
    it('converts fields to a valid JSON Schema object', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'topic', type: 'text', required: true, defaultValue: '', description: 'The topic', example: 'AI' },
        { id: '2', name: 'count', type: 'number', required: false, defaultValue: '5', description: '', example: '' },
      ]

      const schema = schemaFieldsToJsonSchema(fields)
      expect(schema.type).toBe('object')
      expect(schema.required).toEqual(['topic'])
      expect(schema.properties['topic']).toEqual({
        type: 'string',
        description: 'The topic',
        examples: ['AI'],
      })
      expect(schema.properties['count']).toEqual({
        type: 'number',
        default: 5,
      })
    })

    it('handles select fields with enum', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'lang', type: 'select', required: true, defaultValue: '', description: '', example: '', options: 'en | tr | de' },
      ]

      const schema = schemaFieldsToJsonSchema(fields)
      expect(schema.properties['lang']).toEqual({
        type: 'string',
        format: 'select',
        enum: ['en', 'tr', 'de'],
      })
    })

    it('handles boolean defaults', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'verbose', type: 'boolean', required: false, defaultValue: 'true', description: '', example: '' },
      ]

      const schema = schemaFieldsToJsonSchema(fields)
      expect(schema.properties['verbose']).toEqual({ type: 'boolean', default: true })
    })

    it('skips fields with empty names', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: '', type: 'text', required: true, defaultValue: '', description: '', example: '' },
        { id: '2', name: 'valid', type: 'text', required: false, defaultValue: '', description: '', example: '' },
      ]

      const schema = schemaFieldsToJsonSchema(fields)
      expect(Object.keys(schema.properties)).toEqual(['valid'])
      expect(schema.required).toEqual([])
    })

    it('maps media types with format', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'photo', type: 'image', required: false, defaultValue: '', description: '', example: '' },
        { id: '2', name: 'clip', type: 'video', required: false, defaultValue: '', description: '', example: '' },
      ]

      const schema = schemaFieldsToJsonSchema(fields)
      expect(schema.properties['photo']).toEqual({ type: 'string', format: 'image' })
      expect(schema.properties['clip']).toEqual({ type: 'string', format: 'video' })
    })
  })

  // ── jsonSchemaToFields ───────────────────────────────────────────────────

  describe('jsonSchemaToFields', () => {
    it('parses a standard JSON Schema into SchemaFieldEntry[]', () => {
      const raw = JSON.stringify({
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic' },
          count: { type: 'number', default: 5 },
        },
        required: ['topic'],
      })

      const result = jsonSchemaToFields(raw)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.fields).toHaveLength(2)
      expect(result.fields[0].name).toBe('topic')
      expect(result.fields[0].type).toBe('text')
      expect(result.fields[0].required).toBe(true)
      expect(result.fields[0].description).toBe('The topic')

      expect(result.fields[1].name).toBe('count')
      expect(result.fields[1].type).toBe('number')
      expect(result.fields[1].required).toBe(false)
      expect(result.fields[1].defaultValue).toBe('5')
    })

    it('handles format-based type resolution', () => {
      const raw = JSON.stringify({
        type: 'object',
        properties: {
          photo: { type: 'string', format: 'image' },
          when: { type: 'string', format: 'date-time' },
          link: { type: 'string', format: 'uri' },
        },
      })

      const result = jsonSchemaToFields(raw)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.fields[0].type).toBe('image')
      expect(result.fields[1].type).toBe('datetime')
      expect(result.fields[2].type).toBe('url')
    })

    it('returns error for invalid JSON', () => {
      const result = jsonSchemaToFields('not json')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toContain('Invalid JSON')
    })

    it('handles empty input', () => {
      const result = jsonSchemaToFields('')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.fields).toEqual([])
    })

    it('parses simplified property map (no wrapper)', () => {
      const raw = JSON.stringify({
        topic: { type: 'string' },
        count: { type: 'number' },
      })

      const result = jsonSchemaToFields(raw)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.fields).toHaveLength(2)
    })
  })

  // ── Round-trip ───────────────────────────────────────────────────────────

  describe('round-trip (fields → JSON → fields)', () => {
    it('preserves field data through serialization', () => {
      const original: SchemaFieldEntry[] = [
        { id: '1', name: 'topic', type: 'text', required: true, defaultValue: 'AI', description: 'Main topic', example: 'Machine Learning' },
        { id: '2', name: 'depth', type: 'number', required: false, defaultValue: '3', description: '', example: '' },
        { id: '3', name: 'format', type: 'select', required: true, defaultValue: '', description: '', example: '', options: 'markdown | html | plain' },
      ]

      const serialized = serializeSchemaFields(original)
      const deserialized = deserializeSchemaFields(serialized)

      expect(deserialized).not.toBeNull()
      expect(deserialized!).toHaveLength(3)
      expect(deserialized![0].name).toBe('topic')
      expect(deserialized![0].type).toBe('text')
      expect(deserialized![0].required).toBe(true)
      expect(deserialized![1].name).toBe('depth')
      expect(deserialized![1].type).toBe('number')
      expect(deserialized![2].name).toBe('format')
      expect(deserialized![2].type).toBe('select')
    })
  })

  // ── deserializeSchemaFields ─────────────────────────────────────────────

  describe('deserializeSchemaFields', () => {
    it('returns null for unparseable legacy schema', () => {
      const result = deserializeSchemaFields('this is not valid json at all')
      expect(result).toBeNull()
    })

    it('returns empty array for empty string', () => {
      expect(deserializeSchemaFields('')).toEqual([])
    })

    it('handles legacy raw JSON schema gracefully', () => {
      const legacy = JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      })
      const result = deserializeSchemaFields(legacy)
      expect(result).not.toBeNull()
      expect(result![0].name).toBe('name')
      expect(result![0].required).toBe(true)
    })
  })

  // ── validateSchemaFields ─────────────────────────────────────────────────

  describe('validateSchemaFields', () => {
    it('returns no errors for valid fields', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'topic', type: 'text', required: true, defaultValue: '', description: '', example: '' },
      ]
      expect(validateSchemaFields(fields)).toEqual([])
    })

    it('catches empty field names', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: '', type: 'text', required: true, defaultValue: '', description: '', example: '' },
      ]
      const errors = validateSchemaFields(fields)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('required')
    })

    it('catches invalid identifiers', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: '1invalid', type: 'text', required: false, defaultValue: '', description: '', example: '' },
        { id: '2', name: 'has space', type: 'text', required: false, defaultValue: '', description: '', example: '' },
      ]
      const errors = validateSchemaFields(fields)
      expect(errors).toHaveLength(2)
      expect(errors[0].message).toContain('identifier')
      expect(errors[1].message).toContain('identifier')
    })

    it('catches duplicate names', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'topic', type: 'text', required: false, defaultValue: '', description: '', example: '' },
        { id: '2', name: 'topic', type: 'text', required: false, defaultValue: '', description: '', example: '' },
      ]
      const errors = validateSchemaFields(fields)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('Duplicate')
    })

    it('catches select without options', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'choice', type: 'select', required: false, defaultValue: '', description: '', example: '' },
      ]
      const errors = validateSchemaFields(fields)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('option')
    })

    it('catches invalid number default', () => {
      const fields: SchemaFieldEntry[] = [
        { id: '1', name: 'count', type: 'number', required: false, defaultValue: 'abc', description: '', example: '' },
      ]
      const errors = validateSchemaFields(fields)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('number')
    })
  })
})
