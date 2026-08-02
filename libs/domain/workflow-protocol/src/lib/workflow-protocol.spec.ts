import { describe, expect, it } from 'vitest'

import {
  detectWorkflowDocumentFormat,
  jsonWorkflowDocumentAdapter,
  stripCodeFence,
  yamlWorkflowDocumentAdapter,
} from './workflow-protocol.adapters'
import { normalizeWorkflowDocument } from './workflow-protocol.normalize'
import { readWorkflowDocument, validateWorkflowDocument } from './workflow-protocol.reader'
import {
  WORKFLOW_PROTOCOL_ID,
  formatConnectionEndpoint,
  parseConnectionEndpoint,
} from './workflow-protocol.schema'
import { toCanonicalWorkflowObject, writeWorkflowDocument } from './workflow-protocol.writer'

/** Minimal document that satisfies every required field. */
const MINIMAL = {
  protocol: WORKFLOW_PROTOCOL_ID,
  title: 'Weekly digest',
  steps: [{ step: 1, kind: 'trigger', name: 'Manual Trigger', outputs: ['payload'] }],
  connections: [],
}

describe('connection endpoints', () => {
  it('parses a step reference with a simple field', () => {
    expect(parseConnectionEndpoint('step-2.topic')).toEqual({ step: 2, field: 'topic' })
  })

  it('keeps spaces and dots inside parameter labels', () => {
    expect(parseConnectionEndpoint('step-4.Aspect Ratio')).toEqual({
      step: 4,
      field: 'Aspect Ratio',
    })
    expect(parseConnectionEndpoint('step-4.data.nested.field')).toEqual({
      step: 4,
      field: 'data.nested.field',
    })
  })

  it('rejects malformed endpoints', () => {
    expect(parseConnectionEndpoint('step2.topic')).toBeNull()
    expect(parseConnectionEndpoint('step-0.topic')).toBeNull()
    expect(parseConnectionEndpoint('step-1.')).toBeNull()
    expect(parseConnectionEndpoint('topic')).toBeNull()
  })

  it('round-trips through the formatter', () => {
    const formatted = formatConnectionEndpoint(3, 'Input Image')
    expect(parseConnectionEndpoint(formatted)).toEqual({ step: 3, field: 'Input Image' })
  })
})

describe('format adapters', () => {
  it('detects JSON from a leading brace', () => {
    expect(detectWorkflowDocumentFormat('{"title": "x"}')).toBe('json')
  })

  it('falls back to YAML for anything else', () => {
    expect(detectWorkflowDocumentFormat('title: x')).toBe('yaml')
  })

  it('sees through a markdown fence when detecting', () => {
    expect(detectWorkflowDocumentFormat('```json\n{"title": "x"}\n```')).toBe('json')
  })

  it('strips a fence and reports that it did', () => {
    const result = jsonWorkflowDocumentAdapter.parse('```json\n{"a": 1}\n```')
    expect(result.value).toEqual({ a: 1 })
    expect(result.issues.some((issue) => issue.severity === 'warning')).toBe(true)
  })

  it('leaves unfenced text untouched', () => {
    expect(stripCodeFence('{"a": 1}')).toEqual({ text: '{"a": 1}', stripped: false })
  })

  it('reports a parse-stage error for broken JSON', () => {
    const result = jsonWorkflowDocumentAdapter.parse('{ nope')
    expect(result.value).toBeNull()
    expect(result.issues[0]?.stage).toBe('parse')
  })

  it('reads the same document from JSON and YAML', () => {
    const json = jsonWorkflowDocumentAdapter.parse(JSON.stringify(MINIMAL)).value
    const yaml = yamlWorkflowDocumentAdapter.parse(
      yamlWorkflowDocumentAdapter.stringify(MINIMAL),
    ).value
    expect(yaml).toEqual(json)
  })
})

describe('normalization', () => {
  it('adopts a legacy document with no protocol marker', () => {
    const { document, issues } = normalizeWorkflowDocument({ title: 'x', steps: [] })
    expect(document['protocol']).toBe(WORKFLOW_PROTOCOL_ID)
    expect(issues.some((issue) => issue.path === 'protocol')).toBe(true)
  })

  it('strips the "(verify in palette)" marker the old instructions asked for', () => {
    const { document, issues } = normalizeWorkflowDocument({
      title: 'x',
      steps: [{ step: 1, kind: 'lens', name: 'Topic to Image Generator (verify in palette)' }],
    })
    const steps = document['steps'] as Record<string, unknown>[]
    expect(steps[0]?.['name']).toBe('Topic to Image Generator')
    expect(issues.some((issue) => issue.message.includes('verify in palette'))).toBe(true)
  })

  it('drops non-portable fields rather than failing the import', () => {
    const { document, issues } = normalizeWorkflowDocument({
      title: 'x',
      visibility: 'public',
      lenser_id: 'abc',
      steps: [],
    })
    expect(document['visibility']).toBeUndefined()
    expect(document['lenser_id']).toBeUndefined()
    expect(issues.filter((issue) => issue.severity === 'warning').length).toBeGreaterThanOrEqual(2)
  })

  it('folds a flat cron field into the schedule object', () => {
    const { document } = normalizeWorkflowDocument({
      title: 'x',
      cron: '0 9 * * 1',
      is_active: true,
      steps: [],
    })
    expect(document['schedule']).toEqual({ cron: '0 9 * * 1', isActive: true })
    expect(document['cron']).toBeUndefined()
  })

  it('numbers steps from document order when the model omitted them', () => {
    const { document } = normalizeWorkflowDocument({
      title: 'x',
      steps: [{ kind: 'trigger', name: 'a' }, { kind: 'tool', name: 'b' }],
    })
    const steps = document['steps'] as Record<string, unknown>[]
    expect(steps.map((step) => step['step'])).toEqual([1, 2])
  })

  it('rejects a non-object payload', () => {
    const { issues } = normalizeWorkflowDocument([1, 2, 3])
    expect(issues[0]?.stage).toBe('structure')
  })
})

describe('structural validation', () => {
  it('accepts a minimal document', () => {
    const result = validateWorkflowDocument(MINIMAL)
    expect(result.ok).toBe(true)
    expect(result.value?.title).toBe('Weekly digest')
  })

  it('defaults connections to an empty array', () => {
    const result = validateWorkflowDocument({ ...MINIMAL, connections: undefined })
    expect(result.value?.connections).toEqual([])
  })

  it('defaults an imported schedule to paused', () => {
    const result = validateWorkflowDocument({
      ...MINIMAL,
      schedule: { cron: '0 9 * * 1' },
    })
    expect(result.value?.schedule?.isActive).toBe(false)
  })

  it('rejects a CRON expression that is not five fields', () => {
    const result = validateWorkflowDocument({
      ...MINIMAL,
      schedule: { cron: '*/30 0 9 * * 1' },
    })
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.path.startsWith('schedule'))).toBe(true)
  })

  it('rejects a title below the minimum length', () => {
    const result = validateWorkflowDocument({ ...MINIMAL, title: 'ab' })
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.path === 'title')).toBe(true)
  })

  it('requires at least one step', () => {
    const result = validateWorkflowDocument({ ...MINIMAL, steps: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects an unknown step kind', () => {
    const result = validateWorkflowDocument({
      ...MINIMAL,
      steps: [{ step: 1, kind: 'wizardry', name: 'x' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a malformed connection endpoint', () => {
    const result = validateWorkflowDocument({
      ...MINIMAL,
      connections: [{ from: 'nope', to: 'step-2.x' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects genuinely unknown top-level keys', () => {
    const result = validateWorkflowDocument({ ...MINIMAL, mysteryField: true })
    expect(result.ok).toBe(false)
  })

  it('reports issues as structural, not parse errors', () => {
    const result = validateWorkflowDocument({ ...MINIMAL, title: '' })
    expect(result.issues.every((issue) => issue.stage === 'structure')).toBe(true)
  })
})

describe('readWorkflowDocument', () => {
  it('reads JSON text end to end', () => {
    const result = readWorkflowDocument(JSON.stringify(MINIMAL))
    expect(result.ok).toBe(true)
    expect(result.format).toBe('json')
  })

  it('reads YAML text end to end', () => {
    const yaml = yamlWorkflowDocumentAdapter.stringify(MINIMAL)
    const result = readWorkflowDocument(yaml)
    expect(result.ok).toBe(true)
    expect(result.format).toBe('yaml')
  })

  it('produces an identical document from JSON and YAML', () => {
    const fromJson = readWorkflowDocument(JSON.stringify(MINIMAL))
    const fromYaml = readWorkflowDocument(yamlWorkflowDocumentAdapter.stringify(MINIMAL))
    expect(fromYaml.value).toEqual(fromJson.value)
  })

  it('honours an explicit format over detection', () => {
    const result = readWorkflowDocument('title: x', { format: 'json' })
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.stage).toBe('parse')
  })

  it('refuses empty input with a parse-stage message', () => {
    const result = readWorkflowDocument('   ')
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.stage).toBe('parse')
  })
})

describe('deterministic export', () => {
  const full = {
    protocol: WORKFLOW_PROTOCOL_ID,
    title: 'Topic to video',
    description: 'Turns a topic into a short video.',
    outcome: 'A playable video.',
    schedule: { cron: '0 9 * * 1', isActive: false },
    lenses: [
      {
        ref: 'topic-to-image',
        title: 'Topic to Image',
        instructions: 'Render [[Topic]].',
        parameters: [{ label: 'Topic', required: true }],
        outputs: ['image'],
      },
    ],
    steps: [
      { step: 1, kind: 'trigger', name: 'Manual Trigger', outputs: ['payload'] },
      {
        step: 2,
        kind: 'lens',
        name: 'Topic to Image',
        lensRef: 'topic-to-image',
        parameters: { Topic: 'Istanbul' },
        outputs: ['image'],
      },
    ],
    connections: [{ from: 'step-1.payload', to: 'step-2.Topic' }],
    userInputs: ['Topic'],
    finalOutput: 'A video file.',
  }

  it('writes byte-identical output for the same document', () => {
    const document = validateWorkflowDocument(full).value
    expect(document).not.toBeNull()
    expect(writeWorkflowDocument(document!, 'json')).toBe(
      writeWorkflowDocument(document!, 'json'),
    )
  })

  it('puts protocol and title first', () => {
    const document = validateWorkflowDocument(full).value!
    expect(Object.keys(toCanonicalWorkflowObject(document)).slice(0, 2)).toEqual([
      'protocol',
      'title',
    ])
  })

  it('omits empty optionals', () => {
    const document = validateWorkflowDocument(MINIMAL).value!
    const canonical = toCanonicalWorkflowObject(document)
    expect('connections' in canonical).toBe(false)
    expect('lenses' in canonical).toBe(false)
    expect('schedule' in canonical).toBe(false)
  })

  it('round-trips through JSON without losing protocol information', () => {
    const original = validateWorkflowDocument(full).value!
    const reread = readWorkflowDocument(writeWorkflowDocument(original, 'json'))
    expect(reread.ok).toBe(true)
    expect(reread.value).toEqual(original)
  })

  it('round-trips through YAML without losing protocol information', () => {
    const original = validateWorkflowDocument(full).value!
    const reread = readWorkflowDocument(writeWorkflowDocument(original, 'yaml'), {
      format: 'yaml',
    })
    expect(reread.ok).toBe(true)
    expect(reread.value).toEqual(original)
  })

  it('produces equivalent documents from both formats', () => {
    const original = validateWorkflowDocument(full).value!
    const viaJson = readWorkflowDocument(writeWorkflowDocument(original, 'json')).value
    const viaYaml = readWorkflowDocument(writeWorkflowDocument(original, 'yaml'), {
      format: 'yaml',
    }).value
    expect(viaYaml).toEqual(viaJson)
  })

  it('never emits visibility or internal identifiers', () => {
    const document = validateWorkflowDocument(full).value!
    const text = writeWorkflowDocument(document, 'json')
    expect(text).not.toContain('visibility')
    expect(text).not.toContain('lenser_id')
    expect(text).not.toContain('workflow_id')
  })
})
