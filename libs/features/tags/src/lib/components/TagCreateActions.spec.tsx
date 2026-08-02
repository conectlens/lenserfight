import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

import { TagCreateActions } from './TagCreateActions'

vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}))

describe('TagCreateActions', () => {
  const handlers = () => ({
    onCreateThread: vi.fn(),
    onCreateLens: vi.fn(),
  })

  it('offers both create actions', () => {
    render(<TagCreateActions {...handlers()} />)

    expect(screen.getByRole('button', { name: /Create Thread/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Create Lens/ })).toBeTruthy()
  })

  it('invokes the thread handler without touching the lens handler', () => {
    const h = handlers()
    render(<TagCreateActions {...h} />)

    fireEvent.click(screen.getByRole('button', { name: /Create Thread/ }))

    expect(h.onCreateThread).toHaveBeenCalledTimes(1)
    expect(h.onCreateLens).not.toHaveBeenCalled()
  })

  it('invokes the lens handler without touching the thread handler', () => {
    const h = handlers()
    render(<TagCreateActions {...h} />)

    fireEvent.click(screen.getByRole('button', { name: /Create Lens/ }))

    expect(h.onCreateLens).toHaveBeenCalledTimes(1)
    expect(h.onCreateThread).not.toHaveBeenCalled()
  })

  it('renders the same actions in both placements', () => {
    const { unmount } = render(<TagCreateActions {...handlers()} placement="header" />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
    unmount()

    render(<TagCreateActions {...handlers()} placement="empty" />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('disables both actions when disabled', () => {
    const h = handlers()
    render(<TagCreateActions {...h} disabled />)

    const thread = screen.getByRole('button', { name: /Create Thread/ }) as HTMLButtonElement
    const lens = screen.getByRole('button', { name: /Create Lens/ }) as HTMLButtonElement
    expect(thread.disabled).toBe(true)
    expect(lens.disabled).toBe(true)

    fireEvent.click(thread)
    expect(h.onCreateThread).not.toHaveBeenCalled()
  })
})
