import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// ── Hoisted mock references ──────────────────────────────────────────────────

const { mockOnSave, mockOnClose } = vi.hoisted(() => ({
  mockOnSave: vi.fn(),
  mockOnClose: vi.fn(),
}))

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@lenserfight/ui/components', () => ({
  Tooltip: ({
    children,
    content,
  }: {
    children: React.ReactNode
    content: React.ReactNode
    position?: string
    delayMs?: number
    contentClassName?: string
  }) =>
    React.createElement(
      'span',
      { 'data-testid': 'tooltip-wrapper' },
      children,
      React.createElement('span', { 'data-testid': 'tooltip-content' }, content),
    ),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  Field: ({
    children,
    label,
    error,
    hint,
  }: {
    children: React.ReactNode
    label?: string
    id?: string
    required?: boolean
    error?: string
    hint?: string
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'field' },
      label && React.createElement('label', null, label),
      hint && React.createElement('span', { 'data-testid': 'field-hint' }, hint),
      error && React.createElement('span', { 'data-testid': 'field-error' }, error),
      children,
    ),
  Input: ({ value, onChange, placeholder }: {
    value?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    placeholder?: string
    id?: string
    type?: string
    error?: boolean
    className?: string
    min?: number
    max?: number
    step?: number
  }) =>
    React.createElement('input', { value, onChange, placeholder }),
  SelectField: ({ value, onChange, options }: {
    value?: string
    onChange?: (v: string) => void
    options?: Array<{ value: string; label: string }>
    placeholder?: string
    error?: string
    className?: string
  }) =>
    React.createElement(
      'select',
      {
        value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
      },
      options?.map((o) =>
        React.createElement('option', { key: o.value, value: o.value }, o.label),
      ),
    ),
}))

vi.mock('../../components/WorkflowExpressionInput', () => ({
  WorkflowExpressionInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string
    onChange?: (v: string) => void
    placeholder?: string
    id?: string
    fieldType?: string
    multiline?: boolean
    rows?: number
    mono?: boolean
    error?: boolean
    onBlur?: () => void
  }) =>
    React.createElement('input', {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
      placeholder,
      'data-testid': 'expression-input',
    }),
}))

vi.mock('./ConfigFormFooter', () => ({
  ConfigFormFooter: ({ onSave, onClose }: { onSave: () => void; onClose: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'config-footer' },
      React.createElement('button', { onClick: onSave }, 'Save'),
      React.createElement('button', { onClick: onClose }, 'Cancel'),
    ),
}))

vi.mock('./ValidationSummary', () => ({
  ValidationSummary: () => null,
}))

vi.mock('./SchemaBuilderField', () => ({
  SchemaBuilderField: ({ value }: { value: string }) =>
    React.createElement('div', { 'data-testid': 'schema-builder-field' }, `schema:${value}`),
}))

import { DescriptorFormRenderer } from './DescriptorFormRenderer'

import type { RunnerConfigDescriptor, RunnerFieldTooltip } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDescriptor(
  fields: RunnerConfigDescriptor['fields'],
  overrides: Partial<RunnerConfigDescriptor> = {},
): RunnerConfigDescriptor {
  return {
    nodeType: 'test_node',
    title: 'Test Node Config',
    fields,
    ...overrides,
  }
}

function renderForm(
  descriptor: RunnerConfigDescriptor,
  config: Record<string, unknown> = {},
) {
  return render(
    <DescriptorFormRenderer
      descriptor={descriptor}
      config={{ param_overrides: undefined, ...config }}
      nodeId="node-1"
      onSave={mockOnSave}
      onClose={mockOnClose}
    />,
  )
}

beforeEach(() => {
  mockOnSave.mockReset()
  mockOnClose.mockReset()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DescriptorFormRenderer — RichFieldTooltip', () => {
  // ── 1. Fields with tooltip render HelpCircle icon ───────────────────────

  it('renders a tooltip trigger with aria-label for fields with tooltip', () => {
    const tooltip: RunnerFieldTooltip = {
      summary: 'This explains the field',
    }
    const descriptor = makeDescriptor([
      { key: 'my_field', label: 'My Field', type: 'text', tooltip },
    ])

    renderForm(descriptor)

    const helpTrigger = screen.getByLabelText('Help: This explains the field')
    expect(helpTrigger).toBeTruthy()
  })

  // ── 2. Fields without tooltip or hint render no help icon ───────────────

  it('does not render a help icon for fields without tooltip or hint', () => {
    const descriptor = makeDescriptor([
      { key: 'plain', label: 'Plain Field', type: 'text' },
    ])

    renderForm(descriptor)

    expect(screen.queryByLabelText(/^Help:/)).toBeNull()
  })

  // ── 3. Long hint renders tooltip icon ───────────────────────────────────

  it('renders a tooltip icon for fields with a long hint (>80 chars)', () => {
    const longHint = 'A'.repeat(81)
    const descriptor = makeDescriptor([
      { key: 'long_hint_field', label: 'Long Hint', type: 'text', hint: longHint },
    ])

    renderForm(descriptor)

    const helpTrigger = screen.getByLabelText(`Help: ${longHint}`)
    expect(helpTrigger).toBeTruthy()
  })

  it('does not render tooltip icon for short hints', () => {
    const shortHint = 'Short hint text'
    const descriptor = makeDescriptor([
      { key: 'short_hint_field', label: 'Short Hint', type: 'text', hint: shortHint },
    ])

    renderForm(descriptor)

    // Short hint is inline, no tooltip trigger
    expect(screen.queryByLabelText(/^Help:/)).toBeNull()
    // But the hint text should appear inline via Field component
    expect(screen.getByTestId('field-hint')).toBeTruthy()
    expect(screen.getByTestId('field-hint').textContent).toBe(shortHint)
  })

  // ── 4. schema_builder type renders SchemaBuilderField ───────────────────

  it('renders SchemaBuilderField for schema_builder type fields', () => {
    const descriptor = makeDescriptor([
      { key: 'output_schema', label: 'Output Schema', type: 'schema_builder' },
    ])

    renderForm(descriptor)

    expect(screen.getByTestId('schema-builder-field')).toBeTruthy()
  })

  // ── 5. Tooltip content includes summary text ───────────────────────────

  it('tooltip content includes summary, whenRequired, and format', () => {
    const tooltip: RunnerFieldTooltip = {
      summary: 'Main summary here',
      whenRequired: 'When using custom mode',
      format: 'JSON string',
      commonMistakes: 'Forgetting quotes',
      executionImpact: 'Slower when enabled',
    }
    const descriptor = makeDescriptor([
      { key: 'rich', label: 'Rich Field', type: 'text', tooltip },
    ])

    renderForm(descriptor)

    // The tooltip wrapper should contain the structured content
    const tooltipContents = screen.getAllByTestId('tooltip-content')
    const tooltipHtml = tooltipContents.map((el) => el.textContent).join(' ')

    expect(tooltipHtml).toContain('Main summary here')
    expect(tooltipHtml).toContain('When using custom mode')
    expect(tooltipHtml).toContain('JSON string')
    expect(tooltipHtml).toContain('Forgetting quotes')
    expect(tooltipHtml).toContain('Slower when enabled')
  })

  it('tooltip content only shows summary when no other metadata is provided', () => {
    const tooltip: RunnerFieldTooltip = {
      summary: 'Just a summary',
    }
    const descriptor = makeDescriptor([
      { key: 'simple_tip', label: 'Simple Tip', type: 'text', tooltip },
    ])

    renderForm(descriptor)

    const tooltipContents = screen.getAllByTestId('tooltip-content')
    const tooltipHtml = tooltipContents.map((el) => el.textContent).join(' ')

    expect(tooltipHtml).toContain('Just a summary')
    expect(tooltipHtml).not.toContain('When needed:')
    expect(tooltipHtml).not.toContain('Format:')
  })

  // ── Banner rendering ────────────────────────────────────────────────────

  it('renders a banner when descriptor includes one', () => {
    const descriptor = makeDescriptor(
      [{ key: 'f', label: 'F', type: 'text' }],
      { banner: { text: 'This is a warning banner', variant: 'warning' } },
    )

    renderForm(descriptor)

    expect(screen.getByText('This is a warning banner')).toBeTruthy()
  })
})
