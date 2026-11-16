import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseAuth, approveDeviceRequest, rpc, getSession, replaceLocationSafely } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  approveDeviceRequest: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
  replaceLocationSafely: vi.fn(),
}))

vi.mock('@lenserfight/features/auth', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('@lenserfight/data/repositories', () => ({ authService: { approveDeviceRequest } }))
vi.mock('@lenserfight/data/supabase', () => ({ supabase: { rpc, auth: { getSession } } }))
vi.mock('@lenserfight/ui/components', () => ({
  Button: ({ children, type }: { children: React.ReactNode; type?: 'submit' | 'button' }) => (
    <button type={type}>{children}</button>
  ),
}))
vi.mock('../utils/validateReturnUrl', () => ({
  DEFAULT_RETURN_URL: '/home',
  replaceLocationSafely: (url: string) => replaceLocationSafely(url),
  sanitizeReturnUrl: (value: string | null) => value ?? '/return',
}))

import DeviceApprovalPage from './DeviceApprovalPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DeviceApprovalPage />
    </MemoryRouter>
  )
}

describe('DeviceApprovalPage login mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    approveDeviceRequest.mockResolvedValue({ status: 'approved' })
    getSession.mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'r' } } })
    rpc.mockResolvedValue({ error: null })
  })

  it('does not pre-fill the approval code from the link', () => {
    renderAt('/device-approval?code=ABCD-EFGH&mode=login')
    expect((screen.getByLabelText(/approval code/i) as HTMLInputElement).value).toBe('')
  })

  it('does not submit the session until the user types a code', async () => {
    renderAt('/device-approval?code=ABCD-EFGH&mode=login')
    fireEvent.click(screen.getByRole('button', { name: /approve login/i }))
    await waitFor(() => expect(screen.getByText(/enter the 8-character approval code/i)).not.toBeNull())
    expect(approveDeviceRequest).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('stores the session for the code the user typed', async () => {
    renderAt('/device-approval?code=ABCD-EFGH&mode=login')
    fireEvent.change(screen.getByLabelText(/approval code/i), { target: { value: 'wxyz-1234' } })
    fireEvent.click(screen.getByRole('button', { name: /approve login/i }))
    await waitFor(() => expect(rpc).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith('fn_auth_store_device_login_session', {
      p_user_code: 'WXYZ-1234',
      p_access_token: 'a',
      p_refresh_token: 'r',
    })
  })

  it('still pre-fills the code for regular device approval', () => {
    renderAt('/device-approval?code=ABCD-EFGH')
    expect((screen.getByLabelText(/approval code/i) as HTMLInputElement).value).toBe('ABCD-EFGH')
  })
})
