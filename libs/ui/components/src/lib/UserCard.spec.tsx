import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { UserCard } from './UserCard'

describe('UserCard', () => {
  it('renders secure workspace switching entries and forwards the selected workspace id', () => {
    const onSwitchWorkspace = vi.fn()

    render(
      <UserCard
        user={{ id: 'user-1', email: 'owner@example.com' }}
        lenser={{ handle: 'owner', display_name: 'Owner', avatar_url: null }}
        onLogout={vi.fn().mockResolvedValue(undefined)}
        workspaces={[
          {
            id: 'human-1',
            handle: 'owner',
            display_name: 'Owner',
            avatar_url: null,
            type: 'human',
            is_active: true,
          },
          {
            id: 'ai-1',
            handle: 'owner-bot',
            display_name: 'Owner Bot',
            avatar_url: null,
            type: 'ai',
            is_active: false,
          },
        ]}
        onSwitchWorkspace={onSwitchWorkspace}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /owner/i }))
    expect(screen.getByText('Switch workspace')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /owner bot/i }))

    expect(onSwitchWorkspace).toHaveBeenCalledWith('ai-1')
  })
})
