import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { ExportModal } from './ExportModal'
import { Button } from '@lenserfight/ui/components'


// ── external deps ─────────────────────────────────────────────────────────────

vi.mock('@lenserfight/ui/overlays', () => ({
  Dialog: ({ children, open, footer, title }: any) =>
    open ? (
      <div data-testid="dialog">
        <span data-testid="dialog-title">{title}</span>
        {children}
        {footer}
      </div>
    ) : null,
  ModalFooter: ({ leftButton, primaryButton }: any) => (
    <div>
      <Button onClick={leftButton.onClick} disabled={leftButton.disabled}>
        {leftButton.label}
      </Button>
      <Button
        onClick={primaryButton.onClick}
        disabled={primaryButton.disabled}
        data-testid="confirm-btn"
      >
        {primaryButton.label}
      </Button>
    </div>
  ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  HelpButton: () => null,
}))

vi.mock('@lenserfight/ui/feedback', () => ({
  InlineNotice: ({ children, variant, title }: any) => (
    <div data-testid={`notice-${variant}`}>
      {title && <span>{title}</span>}
      {children}
    </div>
  ),
}))

vi.mock('@lenserfight/domain/exports', async () => {
  const actual = await vi.importActual('@lenserfight/domain/exports')
  return actual
})

const mockRunExportDefault = vi.fn()
vi.mock('../hooks/useExportRunner', () => ({
  useExportRunner: () => mockRunExportDefault,
}))

vi.mock('../hooks/useRuntimeMode', () => ({
  useRuntimeMode: () => 'cloud',
}))

vi.mock('@lenserfight/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true }),
}))

vi.mock('@lenserfight/data/supabase', () => ({ supabase: {} }))
vi.mock('@lenserfight/data/exports', () => ({
  SupabaseExportsRepository: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../transport/CloudDownloadTransport', () => ({
  CloudDownloadTransport: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../transport/LocalDownloadTransport', () => ({
  LocalDownloadTransport: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('../components/DestinationSelector', () => ({
  DestinationSelector: ({ value, onChange }: any) => (
    <div data-testid="destination-selector" data-value={value}>
      <Button type="button" onClick={() => onChange('cloud-download')}>Cloud</Button>
      <Button type="button" onClick={() => onChange('local-download')}>Device</Button>
    </div>
  ),
}))

vi.mock('../components/FormatSelector', () => ({
  FormatSelector: ({ value, onChange }: any) => (
    <div data-testid="format-selector" data-value={value}>
      <Button type="button" onClick={() => onChange('markdown')}>Markdown</Button>
      <Button type="button" onClick={() => onChange('json')}>JSON</Button>
      <Button type="button" onClick={() => onChange('yaml')}>YAML</Button>
    </div>
  ),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  kind: 'battle' as const,
  slug: 'test-battle',
  fetchPayload: vi.fn().mockResolvedValue({ id: 'battle-1' }),
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunExportDefault.mockResolvedValue({ transport: 'cloud-download', artifacts: [] })
  })

  it('renders nothing when closed', () => {
    render(<ExportModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('dialog')).toBeNull()
  })

  it('renders the dialog when open', () => {
    render(<ExportModal {...defaultProps} />)
    expect(screen.getByTestId('dialog')).toBeTruthy()
  })

  it('shows the entity title in the header', () => {
    render(<ExportModal {...defaultProps} title="My Battle" />)
    expect(screen.getByTestId('dialog-title').textContent).toContain('My Battle')
  })

  it('truncates header titles longer than 60 characters', () => {
    const longTitle = 'A'.repeat(65)
    render(<ExportModal {...defaultProps} title={longTitle} />)
    const header = screen.getByTestId('dialog-title').textContent ?? ''
    expect(header.length).toBeLessThanOrEqual(60)
    expect(header.endsWith('...')).toBe(true)
  })

  describe('handleConfirm — without onConfirm (the critical bug path)', () => {
    it('calls useExportRunner with the selected format and destination', async () => {
      render(<ExportModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(mockRunExportDefault).toHaveBeenCalledWith({
          format: 'markdown',
          destination: 'cloud-download',
        })
      })
    })

    it('calls onClose after a successful export', async () => {
      const onClose = vi.fn()
      render(<ExportModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('does NOT call fetchPayload directly (no silent no-op)', async () => {
      const fetchPayload = vi.fn().mockResolvedValue({})
      render(<ExportModal {...defaultProps} fetchPayload={fetchPayload} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => expect(mockRunExportDefault).toHaveBeenCalled())
      expect(fetchPayload).not.toHaveBeenCalled()
    })

    it('shows an error notice when the runner throws', async () => {
      mockRunExportDefault.mockRejectedValueOnce(new Error('Transport timeout'))
      render(<ExportModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('notice-error')).toBeTruthy()
        expect(screen.getByTestId('notice-error').textContent).toContain('Transport timeout')
      })
    })

    it('keeps modal open when export fails', async () => {
      mockRunExportDefault.mockRejectedValueOnce(new Error('fail'))
      const onClose = vi.fn()
      render(<ExportModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => screen.getByTestId('notice-error'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('handleConfirm — with onConfirm override (test/Storybook path)', () => {
    it('calls onConfirm instead of the default runner', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<ExportModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith({
          format: 'markdown',
          destination: 'cloud-download',
        })
        expect(mockRunExportDefault).not.toHaveBeenCalled()
      })
    })

    it('passes the user-selected format to onConfirm', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<ExportModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByRole('button', { name: 'JSON' }))
      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ format: 'json' }),
        )
      })
    })

    it('passes the user-selected destination to onConfirm', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<ExportModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByRole('button', { name: 'Device' }))
      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ destination: 'local-download' }),
        )
      })
    })

    it('shows error notice when onConfirm throws', async () => {
      const onConfirm = vi.fn().mockRejectedValueOnce(new Error('Auth error'))
      render(<ExportModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('notice-error').textContent).toContain('Auth error')
      })
    })
  })

  describe('loading state', () => {
    it('disables the confirm button while running', async () => {
      let resolve!: () => void
      mockRunExportDefault.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)))
      render(<ExportModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('confirm-btn').getAttribute('disabled')).not.toBeNull()
      })

      resolve()
    })

    it('shows "Exporting…" label while running', async () => {
      let resolve!: () => void
      mockRunExportDefault.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)))
      render(<ExportModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('confirm-btn').textContent).toBe('Exporting…')
      })

      resolve()
    })
  })

  describe('info notice', () => {
    it('shows the redaction policy notice by default', () => {
      render(<ExportModal {...defaultProps} />)
      expect(screen.getByTestId('notice-info')).toBeTruthy()
    })

    it('replaces the info notice with an error notice after failure', async () => {
      mockRunExportDefault.mockRejectedValueOnce(new Error('oops'))
      render(<ExportModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.queryByTestId('notice-info')).toBeNull()
        expect(screen.getByTestId('notice-error')).toBeTruthy()
      })
    })
  })
})
