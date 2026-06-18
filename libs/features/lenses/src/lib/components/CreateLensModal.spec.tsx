import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/features/lens-kinds', () => ({
  LensKindPicker: () => null,
  LENS_KIND_REGISTRY: {},
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, children, footer }: any) =>
    open ? React.createElement('div', null, children, footer) : null,
  ModalFooter: ({ primaryButton, leftButton }: any) =>
    React.createElement(
      'div',
      null,
      leftButton && React.createElement('button', { onClick: leftButton.onClick }, leftButton.label),
      primaryButton && React.createElement('button', { onClick: primaryButton.onClick }, primaryButton.label),
    ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  FormError: () => null,
  Button: ({ children, onClick, disabled }: any) =>
    React.createElement('button', { onClick, disabled }, children),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  SelectField: ({ value, onChange, options }: any) =>
    React.createElement(
      'select',
      { value, onChange: (e: any) => onChange?.(e.target.value) },
      options?.map((o: any) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
    ),
  InputField: ({ label, value, onChange, placeholder }: any) =>
    React.createElement('input', { 'aria-label': label, value: value ?? '', onChange, placeholder }),
  LensContentEditor: React.forwardRef(({ value, onChange }: any, _ref: any) =>
    React.createElement('textarea', { value: value ?? '', onChange: (e: any) => onChange?.(e.target.value) }),
  ),
}))

vi.mock('@lenserfight/utils/text', () => ({
  copyTextToClipboard: vi.fn(),
}))

vi.mock('@lenserfight/utils/validation', () => ({
  useFormValidation: () => ({ errors: {}, validate: vi.fn(() => true), clearError: vi.fn() }),
  isRequired: () => () => null,
  minLength: () => () => null,
}))

vi.mock('../hooks/useTools', () => ({
  useTools: () => ({ tools: [], isLoading: false, textToolId: undefined }),
}))

vi.mock('./GenerateWithAIButton', () => ({
  GenerateWithAIButton: () => null,
}))

vi.mock('./LensParameterPanel', () => ({
  ParameterPanel: () => null,
}))

vi.mock('./LensTagInput', () => ({
  LensTagInput: () => null,
}))

vi.mock('./LensVersionHistoryButton', () => ({
  LensVersionHistoryButton: () => null,
}))

import { CreateLensModal } from './CreateLensModal'

const defaultForm = {
  title: '',
  setTitle: vi.fn(),
  content: '',
  setContent: vi.fn(),
  tags: [],
  setTags: vi.fn(),
  visibility: 'public' as const,
  setVisibility: vi.fn(),
  versionParams: [],
  setVersionParams: vi.fn(),
  syncParamsFromContent: vi.fn(),
}

describe('CreateLensModal visibility options', () => {
  it('renders all 4 visibility options (public, members only, followers, private)', () => {
    render(
      <CreateLensModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        form={defaultForm}
        isSubmitting={false}
        error={null}
      />,
    )
    expect(screen.getByRole('option', { name: 'Public' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Members only' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Followers only' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Private' })).toBeTruthy()
  })
})
