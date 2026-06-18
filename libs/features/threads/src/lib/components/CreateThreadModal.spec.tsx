import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/data/repositories', () => ({
  lenserService: { searchLensers: vi.fn().mockResolvedValue([]) },
  tagService: { searchTags: vi.fn().mockResolvedValue([]), processUserInput: vi.fn() },
}))

vi.mock('../hooks/useCreateThread', () => ({
  useCreateThread: () => ({ createThread: vi.fn(), isSubmitting: false, error: null }),
}))

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ open, children }: any) =>
    open ? React.createElement('div', null, children) : null,
  ModalFooter: ({ primaryButton, leftButton }: any) =>
    React.createElement(
      'div',
      null,
      leftButton && React.createElement('button', { onClick: leftButton.onClick }, leftButton.label),
      primaryButton && React.createElement('button', { type: primaryButton.type, onClick: primaryButton.onClick }, primaryButton.label),
    ),
}))

vi.mock('@lenserfight/ui/forms', () => ({
  SelectField: ({ value, onChange, options }: any) =>
    React.createElement(
      'select',
      { value, onChange: (e: any) => onChange?.(e.target.value) },
      options?.map((o: any) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
    ),
  RichMentionInput: React.forwardRef((_props: any, _ref: any) =>
    React.createElement('div', { 'data-testid': 'rich-mention' }),
  ),
}))

vi.mock('./ThreadMediaPicker', () => ({
  ThreadMediaPicker: () => null,
}))

vi.mock('./MentionAutocompleteList', () => ({
  MentionAutocompleteList: () => null,
}))

vi.mock('./TagMentionAutocompleteList', () => ({
  TagMentionAutocompleteList: () => null,
}))

import { CreateThreadModal } from './CreateThreadModal'

describe('CreateThreadModal visibility options', () => {
  it('renders all 4 visibility options (public, members only, followers, private)', () => {
    render(
      <CreateThreadModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
    )
    expect(screen.getByRole('option', { name: 'Public' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Members only' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Followers only' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Private' })).toBeTruthy()
  })
})
