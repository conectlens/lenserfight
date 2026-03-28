import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@lenserfight/features/auth'
import DeviceApprovalPage from './DeviceApprovalPage'

const approveDeviceRequest = vi.fn()
const replaceLocationSafely = vi.fn()

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  approveDeviceRequest: (...args: unknown[]) => approveDeviceRequest(...args),
}))

vi.mock('../utils/validateReturnUrl', () => ({
  replaceLocationSafely: (...args: unknown[]) => replaceLocationSafely(...args),
  sanitizeReturnUrl: (value: string | null) => value ?? '/return',
}))

describe('DeviceApprovalPage', () => {
  beforeEach(() => {
    approveDeviceRequest.mockReset()
    replaceLocationSafely.mockReset()
    vi.mocked(useAuth).mockReset()
  })

  it('approves a device request and shows confirmation', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isLoading: false } as never)
    approveDeviceRequest.mockResolvedValue({
      requestId: 'req-123',
      status: 'approved',
      approvedAt: '2026-03-28T00:00:00Z',
      expiresAt: '2026-03-28T01:00:00Z',
      label: 'CLI',
    })

    render(
      <MemoryRouter initialEntries={['/device-approval?code=abcd-efgh']}>
        <DeviceApprovalPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /approve device/i }))

    expect(await screen.findByText(/device approved for cli/i)).not.toBeNull()
    expect(approveDeviceRequest).toHaveBeenCalledWith({ userCode: 'ABCD-EFGH' })
  })

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, isLoading: false } as never)

    render(
      <MemoryRouter initialEntries={['/device-approval?code=abcd-efgh']}>
        <DeviceApprovalPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(replaceLocationSafely).toHaveBeenCalled()
    })

    expect(replaceLocationSafely).toHaveBeenCalledWith(
      '/login?return_url=%2Fdevice-approval%3Fcode%3Dabcd-efgh'
    )
  })
})
