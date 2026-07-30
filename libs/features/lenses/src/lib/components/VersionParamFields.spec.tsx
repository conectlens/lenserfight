import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/ui/forms', () => ({
  ToolField: () => null,
}))

import { VersionParamFields } from './VersionParamFields'

describe('VersionParamFields parameter imports', () => {
  it('exposes keyboard-accessible JSON and CSV import actions', () => {
    const onImportJson = vi.fn()
    const onImportCsv = vi.fn()

    render(
      <VersionParamFields
        params={[]}
        values={{}}
        errors={{}}
        onChange={vi.fn()}
        onImportJson={onImportJson}
        onImportCsv={onImportCsv}
      />
    )

    const jsonButton = screen.getByRole('button', { name: 'Import JSON' })
    const csvButton = screen.getByRole('button', { name: 'Import CSV' })
    expect(jsonButton.getAttribute('type')).toBe('button')
    expect(csvButton.getAttribute('type')).toBe('button')

    fireEvent.click(jsonButton)
    fireEvent.click(csvButton)

    expect(onImportJson).toHaveBeenCalledTimes(1)
    expect(onImportCsv).toHaveBeenCalledTimes(1)
  })

  it('only renders import actions that are available', () => {
    render(
      <VersionParamFields
        params={[]}
        values={{}}
        errors={{}}
        onChange={vi.fn()}
        onImportJson={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Import CSV' })).toBeNull()
  })
})
