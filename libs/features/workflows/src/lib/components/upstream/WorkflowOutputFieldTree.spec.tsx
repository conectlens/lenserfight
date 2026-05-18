import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import React from 'react'

import { WorkflowOutputFieldTree } from './WorkflowOutputFieldTree'
import type { WorkflowNodeSchemaField } from '@lenserfight/infra/execution'

const schema: WorkflowNodeSchemaField[] = [
  { name: 'text', type: 'text', description: 'Text output' },
  { name: 'count', type: 'number', description: 'Item count' },
]

describe('WorkflowOutputFieldTree', () => {
  it('shows "no output fields" when schema is empty', () => {
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={[]}
        executedValues={null}
        hasRun={false}
      />,
    )
    expect(screen.getByText(/no output fields/i)).toBeDefined()
  })

  it('renders a row for each schema field', () => {
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={schema}
        executedValues={null}
        hasRun={false}
      />,
    )
    // 'text' appears as both field name and type badge — use getAllByText
    expect(screen.getAllByText('text').length).toBeGreaterThanOrEqual(1)
    // 'count' field name is unique; type badge shows 'number'
    expect(screen.getByText('count')).toBeDefined()
  })

  it('shows "Run to see live values" when hasRun is false', () => {
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={schema}
        executedValues={null}
        hasRun={false}
      />,
    )
    expect(screen.getByText(/run the workflow/i)).toBeDefined()
  })

  it('does not show "Run to see live values" when hasRun is true', () => {
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={schema}
        executedValues={{ text: 'hello', count: 5 }}
        hasRun
      />,
    )
    expect(screen.queryByText(/run the workflow/i)).toBeNull()
  })

  it('renders live values when executedValues provided', () => {
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={schema}
        executedValues={{ text: 'hello result', count: 42 }}
        hasRun
      />,
    )
    expect(screen.getByText('hello result')).toBeDefined()
    expect(screen.getByText('42')).toBeDefined()
  })

  it('truncates large values', () => {
    const longValue = 'x'.repeat(300)
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={[{ name: 'big', type: 'text', description: '' }]}
        executedValues={{ big: longValue }}
        hasRun
      />,
    )
    // Should show truncated value with ellipsis
    const el = screen.getByText(/x+…/)
    expect(el.textContent?.length).toBeLessThan(longValue.length + 5)
  })

  it('masks sensitive fields', () => {
    const sensitiveSchema = [
      { name: 'secret', type: 'text', description: '', sensitive: true } as WorkflowNodeSchemaField & { sensitive: boolean },
    ]
    render(
      <WorkflowOutputFieldTree
        nodeId="n1"
        outputSchema={sensitiveSchema}
        executedValues={{ secret: 'my-api-key' }}
        hasRun
      />,
    )
    expect(screen.queryByText('my-api-key')).toBeNull()
    expect(screen.getByText('••••••')).toBeDefined()
  })
})
