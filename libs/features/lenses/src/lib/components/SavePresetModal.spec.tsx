import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, children, footer }: any) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children, footer) : null,
  ModalFooter: ({ primaryButton, leftButton }: any) =>
    React.createElement(
      'div',
      null,
      React.createElement('button', { onClick: leftButton?.onClick, disabled: leftButton?.disabled }, leftButton?.label),
      React.createElement('button', { onClick: primaryButton?.onClick, disabled: primaryButton?.disabled || primaryButton?.isLoading }, primaryButton?.label),
    ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, disabled }: any) =>
    React.createElement('button', { onClick, disabled }, children),
}))

import { SavePresetModal } from './SavePresetModal'

const renderModal = (props: Partial<React.ComponentProps<typeof SavePresetModal>> = {}) =>
  render(
    <SavePresetModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} isSaving={false} {...props} />,
  )

describe('SavePresetModal', () => {
  it('renders with name input and note textarea', () => {
    renderModal()
    expect(screen.getByPlaceholderText(/Formal tone/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/short description/)).toBeTruthy()
  })

  it('Save button is disabled when name is empty', () => {
    renderModal()
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Save button is enabled when name has content', () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText(/Formal tone/), { target: { value: 'My preset' } })
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls onSave with trimmed name and note on submit', () => {
    const onSave = vi.fn()
    renderModal({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/Formal tone/), { target: { value: '  My Preset  ' } })
    fireEvent.change(screen.getByPlaceholderText(/short description/), { target: { value: '  a note  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith('My Preset', 'a note')
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
