import { describe, expect, it } from 'vitest'

import {
  isWorkflowParameterValuePresent,
  normalizeWorkflowParameterEditorValues,
  serializeWorkflowParameterValue,
  serializeWorkflowParameterValues,
} from './workflow-parameter-values'

import type { LensVersionParam } from '@lenserfight/types'

function createParam(label: string, type: LensVersionParam['tool']['type']): LensVersionParam {
  return {
    id: `${label}-id`,
    versionId: 'version-id',
    label,
    toolId: `${label}-tool-id`,
    tool: {
      id: `${label}-tool-id`,
      key: label,
      label,
      description: null,
      category: 'input',
      type,
      required: true,
      minLength: 0,
      maxLength: 0,
      placeholder: null,
      helpText: null,
      validationSchema: null,
      options: null,
      sortOrder: 0,
      isSystem: false,
      icon: null,
      color: null,
    },
  }
}

describe('workflow parameter editor values', () => {
  const params = [
    createParam('enabled', 'boolean'),
    createParam('channels', 'multiselect'),
    createParam('title', 'text'),
  ]

  it('normalizes persisted boolean and multiselect values for typed fields', () => {
    expect(
      normalizeWorkflowParameterEditorValues(
        {
          enabled: 'false',
          channels: '["email","slack"]',
          title: 'Daily report',
        },
        params
      )
    ).toEqual({
      enabled: false,
      channels: ['email', 'slack'],
      title: 'Daily report',
    })
  })

  it('accepts delimited multiselect imports and truthy boolean text', () => {
    expect(
      normalizeWorkflowParameterEditorValues(
        {
          enabled: 'yes',
          channels: 'email; slack | webhook',
        },
        params
      )
    ).toEqual({
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
    })
  })

  it('serializes typed editor values at the workflow persistence boundary', () => {
    expect(
      serializeWorkflowParameterValues({
        enabled: false,
        channels: ['email', 'slack'],
        metadata: { priority: 1 },
        omitted: undefined,
      })
    ).toEqual({
      enabled: 'false',
      channels: '["email","slack"]',
      metadata: '{"priority":1}',
    })
    expect(serializeWorkflowParameterValue(0)).toBe('0')
  })

  it('treats false and zero as filled while rejecting empty values', () => {
    expect(isWorkflowParameterValuePresent(false)).toBe(true)
    expect(isWorkflowParameterValuePresent(0)).toBe(true)
    expect(isWorkflowParameterValuePresent('  ')).toBe(false)
    expect(isWorkflowParameterValuePresent([])).toBe(false)
    expect(isWorkflowParameterValuePresent(null)).toBe(false)
  })
})
