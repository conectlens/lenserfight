import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockOnChange, mockOnBlur } = vi.hoisted(() => ({
  mockOnChange: vi.fn(),
  mockOnBlur: vi.fn(),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    className?: string
    title?: string
  }) =>
    React.createElement('button', { onClick, title: rest.title, className: rest.className }, children),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    error,
    className,
    ...rest
  }: {
    value?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    placeholder?: string
    error?: boolean
    className?: string
    type?: string
    id?: string
    min?: number
    max?: number
    step?: number
  }) =>
    React.createElement('input', {
      value,
      onChange,
      placeholder,
      'data-error': error || undefined,
      className,
      type: rest.type ?? 'text',
    }),
  SelectField: ({
    value,
    onChange,
    options,
    className,
  }: {
    value?: string
    onChange?: (v: string) => void
    options?: Array<{ value: string; label: string }>
    className?: string
    placeholder?: string
    error?: string
  }) =>
    React.createElement(
      'select',
      {
        value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
        className,
      },
      options?.map((o) =>
        React.createElement('option', { key: o.value, value: o.value }, o.label),
      ),
    ),
}))

import { SchemaBuilderField } from './SchemaBuilderField'
import { serializeSchemaFields } from './schema-parser'

import type { SchemaFieldEntry } from '../../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSerializedFields(fields: Partial<SchemaFieldEntry>[]): string {
  const full: SchemaFieldEntry[] = fields.map((f, i) => ({
    id: `test_${i}`,
    name: f.name ?? '',
    type: f.type ?? 'text',
    required: f.required ?? false,
    defaultValue: f.defaultValue ?? '',
    description: f.description ?? '',
    example: f.example ?? '',
    options: f.options,
  }))
  return serializeSchemaFields(full)
}

function renderBuilder(props: Partial<React.ComponentProps<typeof SchemaBuilderField>> = {}) {
  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onBlur: mockOnBlur,
  }
  return render(<SchemaBuilderField {...defaultProps} {...props} />)
}

beforeEach(() => {
  mockOnChange.mockReset()
  mockOnBlur.mockReset()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SchemaBuilderField', () => {
  // ── 1. Empty state ──────────────────────────────────────────────────────

  it('renders "Add Field" button when value is empty', () => {
    renderBuilder({ value: '' })
    expect(screen.getByText(/add field/i)).toBeTruthy()
  })

  it('shows no field cards when value is empty', () => {
    const { container } = renderBuilder({ value: '' })
    // No field cards — no "#1" ordinal
    expect(container.querySelector('[class*="rounded-xl"]')).toBeNull()
  })

  // ── 2. Renders parsed fields ────────────────────────────────────────────

  it('renders field cards when given a valid JSON schema string', () => {
    const value = makeSerializedFields([
      { name: 'topic', type: 'text', required: true },
      { name: 'count', type: 'number' },
    ])
    renderBuilder({ value })

    expect(screen.getByText('#1')).toBeTruthy()
    expect(screen.getByText('#2')).toBeTruthy()
  })

  // ── 3. Raw mode fallback ────────────────────────────────────────────────

  it('falls back to raw mode when value is unparseable JSON', () => {
    renderBuilder({ value: '{{{invalid json' })

    expect(screen.getByText(/raw json schema/i)).toBeTruthy()
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.getByText(/try form mode/i)).toBeTruthy()
  })

  it('shows raw textarea with the unparseable value', () => {
    const badValue = '{{{invalid'
    renderBuilder({ value: badValue })

    const textarea = document.querySelector('textarea')!
    expect(textarea.value).toBe(badValue)
  })

  // ── 4. Add field ────────────────────────────────────────────────────────

  it('"Add Field" adds a new empty field card', () => {
    renderBuilder({ value: '' })

    fireEvent.click(screen.getByText(/add field/i))

    expect(mockOnChange).toHaveBeenCalledTimes(1)
    // A new empty field (name='') serializes to '' since schemaFieldsToJsonSchema skips empty names
    expect(screen.getByText('#1')).toBeTruthy()
  })

  // ── 5. Remove field ────────────────────────────────────────────────────

  it('remove button removes a field', () => {
    const value = makeSerializedFields([
      { name: 'alpha', type: 'text' },
      { name: 'beta', type: 'text' },
    ])
    renderBuilder({ value })

    const removeButtons = screen.getAllByTitle('Remove field')
    expect(removeButtons.length).toBe(2)

    fireEvent.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalled()
    // After removal, only one field card remains
    expect(screen.queryByText('#2')).toBeNull()
  })

  // ── 6. Move up/down ────────────────────────────────────────────────────

  it('move up reorders fields', () => {
    const value = makeSerializedFields([
      { name: 'first', type: 'text' },
      { name: 'second', type: 'number' },
    ])
    renderBuilder({ value })

    // Move second field up
    const moveUpButtons = screen.getAllByTitle('Move up')
    fireEvent.click(moveUpButtons[1])

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('move down reorders fields', () => {
    const value = makeSerializedFields([
      { name: 'first', type: 'text' },
      { name: 'second', type: 'number' },
    ])
    renderBuilder({ value })

    const moveDownButtons = screen.getAllByTitle('Move down')
    fireEvent.click(moveDownButtons[0])

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('move up is disabled for the first field', () => {
    const value = makeSerializedFields([{ name: 'solo', type: 'text' }])
    renderBuilder({ value })

    const moveUp = screen.getByTitle('Move up')
    expect(moveUp).toHaveProperty('disabled', true)
  })

  it('move down is disabled for the last field', () => {
    const value = makeSerializedFields([{ name: 'solo', type: 'text' }])
    renderBuilder({ value })

    const moveDown = screen.getByTitle('Move down')
    expect(moveDown).toHaveProperty('disabled', true)
  })

  // ── 7. Output contract preview ──────────────────────────────────────────

  it('shows output contract preview with payload.fieldName', () => {
    const value = makeSerializedFields([
      { name: 'topic', type: 'text', required: true },
      { name: 'count', type: 'number' },
    ])
    renderBuilder({ value })

    expect(screen.getByText('payload.topic')).toBeTruthy()
    expect(screen.getByText('payload.count')).toBeTruthy()
  })

  it('does not show output preview when all field names are empty', () => {
    renderBuilder({ value: '' })
    fireEvent.click(screen.getByText(/add field/i))

    expect(screen.queryByText(/output contract preview/i)).toBeNull()
  })

  it('uses custom outputPreviewLabel when provided', () => {
    const value = makeSerializedFields([{ name: 'foo', type: 'text' }])
    renderBuilder({ value, outputPreviewLabel: 'Custom Preview' })

    expect(screen.getByText('Custom Preview')).toBeTruthy()
  })

  // ── 8. Show Generated Schema toggle ─────────────────────────────────────

  it('"Show Generated Schema" toggle reveals JSON preview', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value })

    const toggle = screen.getByText(/show generated schema/i)
    fireEvent.click(toggle)

    // The pre element should now contain the schema JSON
    const pre = document.querySelector('pre')!
    expect(pre).toBeTruthy()
    expect(pre.textContent).toContain('"topic"')
  })

  it('toggle text changes to "Hide" after clicking', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value })

    fireEvent.click(screen.getByText(/show generated schema/i))

    expect(screen.getByText(/hide generated schema/i)).toBeTruthy()
  })

  // ── 9. Edit Raw mode ───────────────────────────────────────────────────

  it('"Edit Raw" switches to raw textarea mode', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value })

    // First reveal advanced panel
    fireEvent.click(screen.getByText(/show generated schema/i))
    // Then click Edit Raw
    fireEvent.click(screen.getByText(/edit raw/i))

    expect(screen.getByText(/raw json schema/i)).toBeTruthy()
  })

  // ── 10. Try Form Mode ──────────────────────────────────────────────────

  it('"Try Form Mode" switches back from raw mode when value is parseable', () => {
    const validValue = makeSerializedFields([{ name: 'topic', type: 'text' }])

    // Track the current value so we can pass it back via rerender
    let currentValue = '{{{bad'
    const trackingOnChange = vi.fn((v: string) => {
      currentValue = v
    })

    const { rerender } = render(
      <SchemaBuilderField value={currentValue} onChange={trackingOnChange} />,
    )
    expect(screen.getByText(/raw json schema/i)).toBeTruthy()

    // Simulate the user editing the textarea to a valid value
    const textarea = document.querySelector('textarea')!
    fireEvent.change(textarea, { target: { value: validValue } })

    // Rerender with the updated (valid) value so the component sees it
    rerender(
      <SchemaBuilderField value={validValue} onChange={trackingOnChange} />,
    )

    // Click "Try Form Mode"
    fireEvent.click(screen.getByText(/try form mode/i))

    // Should switch out of raw mode
    expect(screen.queryByText(/raw json schema/i)).toBeNull()
    expect(screen.getByText(/add field/i)).toBeTruthy()
  })

  // ── 11. onChange called ─────────────────────────────────────────────────

  it('onChange is called with serialized JSON when a field name changes', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value })

    const nameInputs = screen.getAllByPlaceholderText('field_name')
    fireEvent.change(nameInputs[0], { target: { value: 'new_name' } })

    expect(mockOnChange).toHaveBeenCalled()
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
    expect(lastCall).toContain('new_name')
  })

  it('onChange is called when raw textarea value changes', () => {
    renderBuilder({ value: '{{{bad' })

    const textarea = document.querySelector('textarea')!
    fireEvent.change(textarea, { target: { value: '{"type":"object"}' } })

    expect(mockOnChange).toHaveBeenCalledWith('{"type":"object"}')
  })

  // ── 12. Validation errors ──────────────────────────────────────────────

  it('displays duplicate name validation error', () => {
    const value = makeSerializedFields([
      { name: 'topic', type: 'text' },
      { name: 'topic', type: 'text' },
    ])
    // Note: duplicate names in the schema get collapsed to one property, so we need
    // to add a field with the same name at runtime
    renderBuilder({ value })

    // Add a new field and give it the same name as existing
    fireEvent.click(screen.getByText(/add field/i))

    const nameInputs = screen.getAllByPlaceholderText('field_name')
    const lastInput = nameInputs[nameInputs.length - 1]
    fireEvent.change(lastInput, { target: { value: 'topic' } })

    // The validation error should appear
    expect(screen.getByText(/duplicate field name/i)).toBeTruthy()
  })

  it('displays invalid identifier validation error', () => {
    renderBuilder({ value: '' })

    fireEvent.click(screen.getByText(/add field/i))

    const nameInput = screen.getByPlaceholderText('field_name')
    fireEvent.change(nameInput, { target: { value: '123bad' } })

    expect(screen.getByText(/valid identifier/i)).toBeTruthy()
  })

  // ── 13. Required checkbox ──────────────────────────────────────────────

  it('required checkbox toggles the required state', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text', required: false }])
    renderBuilder({ value })

    const checkbox = screen.getByRole('checkbox')
    expect((checkbox as HTMLInputElement).checked).toBe(false)

    fireEvent.click(checkbox)

    expect(mockOnChange).toHaveBeenCalled()
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
    expect(lastCall).toContain('"topic"')
    expect(lastCall).toContain('"required"')
  })

  // ── 14. Select/multi_select shows options ──────────────────────────────

  it('shows options input for select type', () => {
    const value = makeSerializedFields([
      { name: 'lang', type: 'select', options: 'en | tr | de' },
    ])
    renderBuilder({ value })

    expect(screen.getByPlaceholderText(/option1/i)).toBeTruthy()
  })

  it('shows options input for multi_select type', () => {
    const value = makeSerializedFields([
      { name: 'tags', type: 'multi_select', options: 'a | b' },
    ])
    renderBuilder({ value })

    expect(screen.getByPlaceholderText(/option1/i)).toBeTruthy()
  })

  it('does not show options input for text type', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value })

    expect(screen.queryByPlaceholderText(/option1/i)).toBeNull()
  })

  // ── 15. Error prop displayed ───────────────────────────────────────────

  it('displays the error prop', () => {
    const value = makeSerializedFields([{ name: 'topic', type: 'text' }])
    renderBuilder({ value, error: 'Something went wrong' })

    expect(screen.getByText('Something went wrong')).toBeTruthy()
  })

  it('displays error prop in raw mode', () => {
    renderBuilder({ value: '{{{bad', error: 'Parse error' })

    expect(screen.getByText('Parse error')).toBeTruthy()
  })

  // ── Required indicator in output preview ────────────────────────────────

  it('shows required indicator (*) in output preview for required fields', () => {
    const value = makeSerializedFields([
      { name: 'topic', type: 'text', required: true },
    ])
    renderBuilder({ value })

    expect(screen.getByText('*')).toBeTruthy()
  })
})
