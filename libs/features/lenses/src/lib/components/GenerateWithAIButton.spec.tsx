import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

const { mockGenerate, mockResetError, hookState } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockResetError: vi.fn(),
  hookState: { isGenerating: false, error: null as null | { code: string; message: string } },
}))

vi.mock('@lenserfight/infra/ai-creation', () => ({
  useAICreationGeneration: () => ({
    generate: mockGenerate,
    isGenerating: hookState.isGenerating,
    error: hookState.error,
    resetError: mockResetError,
  }),
}))

vi.mock('@lenserfight/features/store', () => ({
  useChainabitConnection: () => ({ state: 'connected', models: [], reconnect: vi.fn() }),
}))

vi.mock('@lenserfight/features/generations', () => ({
  useAIProviders: () => ({ data: [], isLoading: false }),
  useAIModelsByProvider: () => ({ data: [], isLoading: false }),
}))

vi.mock('../hooks/useFundingSource', () => ({
  useFundingSource: () => ({
    fundingSource: 'platform_credit',
    setFundingSource: vi.fn(),
    selectedKeyRefId: null,
    setSelectedKeyRefId: vi.fn(),
    availableKeys: [],
    selectedLocalKeyId: null,
    setSelectedLocalKeyId: vi.fn(),
    localKeys: [],
    localKeyAvailability: 'available',
    addLocalKey: vi.fn(),
    removeLocalKey: vi.fn(),
    updateLocalKey: vi.fn(),
    pairGateway: vi.fn(),
    refreshLocalKeys: vi.fn(),
    walletBalance: undefined,
    canUseBYOK: false,
    resolveLocalKey: vi.fn(),
  }),
}))

vi.mock('./FundingSourceToggle', () => ({
  FundingSourceToggle: () => <div data-testid="funding-toggle" />,
}))

import { GenerateWithAIButton } from './GenerateWithAIButton'

describe('GenerateWithAIButton', () => {
  beforeEach(() => {
    mockGenerate.mockReset()
    mockResetError.mockReset()
    hookState.isGenerating = false
    hookState.error = null
  })

  it('renders an icon-only trigger and opens the popover (funding accordion + textarea) on click', () => {
    render(
      <GenerateWithAIButton profileId="u1" generationType="lens" context={{}} onGenerated={vi.fn()} />,
    )
    const trigger = screen.getByRole('button', { name: 'Generate with AI' })
    expect(trigger).toBeTruthy()
    // Popover is closed initially.
    expect(screen.queryByText('Funding & Model')).toBeNull()

    fireEvent.click(trigger)
    expect(screen.getByText('Funding & Model')).toBeTruthy()
    expect(screen.getByTestId('funding-toggle')).toBeTruthy()
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Suggest' })).toBeTruthy()
  })

  it('generates from the prompt, forwards the typed result, and closes', async () => {
    const output = {
      type: 'lens' as const,
      result: { title: 'T', content: 'C', description: 'D', suggestedTagSlugs: [], params: [] },
    }
    mockGenerate.mockResolvedValueOnce(output)
    const onGenerated = vi.fn()
    render(
      <GenerateWithAIButton profileId="u1" generationType="lens" context={{}} onGenerated={onGenerated} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Generate with AI' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'make a seo lens' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith('make a seo lens'))
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(output))
    await waitFor(() => expect(screen.queryByText('Funding & Model')).toBeNull())
  })

  it('uses recommendation mode (null) when the prompt is empty', async () => {
    mockGenerate.mockResolvedValueOnce(null)
    render(
      <GenerateWithAIButton profileId="u1" generationType="workflow" context={{}} onGenerated={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Generate with AI' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suggest' }))
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith(null))
  })

  it('renders a friendly error alert when generation fails', () => {
    hookState.error = { code: 'RATE_LIMITED', message: 'Slow down there' }
    render(
      <GenerateWithAIButton profileId="u1" generationType="battle" context={{}} onGenerated={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Generate with AI' }))
    expect(screen.getByText('Too many requests')).toBeTruthy()
    expect(screen.getByText('Slow down there')).toBeTruthy()
  })
})
