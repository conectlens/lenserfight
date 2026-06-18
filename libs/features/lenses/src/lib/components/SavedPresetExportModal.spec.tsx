import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

const { mockCopy } = vi.hoisted(() => ({ mockCopy: vi.fn() }))

vi.mock('@lenserfight/utils/text', () => ({
  copyTextToClipboard: (...args: any[]) => mockCopy(...args),
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, children, footer }: any) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children, footer) : null,
  ModalFooter: ({ primaryButton, leftButton }: any) =>
    React.createElement(
      'div',
      null,
      React.createElement('button', { onClick: leftButton?.onClick }, leftButton?.label),
      React.createElement('button', { onClick: primaryButton?.onClick }, primaryButton?.label),
    ),
}))

import { SavedPresetExportModal } from './SavedPresetExportModal'

const preset = { name: 'Test Preset', values: { tone: 'formal', words: 500 } }

describe('SavedPresetExportModal', () => {
  it('JSON mode: renders JSON.stringify of preset values in pre element', () => {
    render(
      <SavedPresetExportModal isOpen preset={preset} format="json" onClose={vi.fn()} />,
    )
    const pre = document.querySelector('pre')
    expect(pre?.textContent).toBe(JSON.stringify(preset.values, null, 2))
  })

  it('CSV mode: renders header row with param labels and value row', () => {
    render(
      <SavedPresetExportModal
        isOpen
        preset={preset}
        format="csv"
        onClose={vi.fn()}
        versionParams={[{ label: 'tone' }, { label: 'words' }]}
      />,
    )
    const pre = document.querySelector('pre')
    expect(pre?.textContent).toContain('tone,words')
    expect(pre?.textContent).toContain('formal,500')
  })

  it('CSV mode: stringifies nested objects', () => {
    const presetWithObj = {
      name: 'Nested',
      values: { config: { a: 1 }, title: 'hello' },
    }
    render(
      <SavedPresetExportModal
        isOpen
        preset={presetWithObj}
        format="csv"
        onClose={vi.fn()}
        versionParams={[{ label: 'config' }, { label: 'title' }]}
      />,
    )
    const pre = document.querySelector('pre')
    // Nested object is JSON.stringified then CSV-escaped (quotes doubled): {"a":1} → "{""a"":1}"
    expect(pre?.textContent).toContain('"a"')
  })

  it('copy button exists in JSON mode', () => {
    render(
      <SavedPresetExportModal isOpen preset={preset} format="json" onClose={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })

  it('copy button exists in CSV mode', () => {
    render(
      <SavedPresetExportModal
        isOpen
        preset={preset}
        format="csv"
        onClose={vi.fn()}
        versionParams={[{ label: 'tone' }, { label: 'words' }]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })
})
