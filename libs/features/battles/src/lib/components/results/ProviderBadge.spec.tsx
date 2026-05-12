import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, it, expect } from 'vitest'
import { ProviderBadge } from './ProviderBadge'

describe('ProviderBadge', () => {
  it('renders BYOK Cloud badge', () => {
    render(<ProviderBadge fundingSource="user_byok_cloud" />)
    expect(screen.getByText('BYOK Cloud')).toBeTruthy()
  })

  it('renders Local badge for user_byok_local', () => {
    render(<ProviderBadge fundingSource="user_byok_local" />)
    expect(screen.getByText('Local')).toBeTruthy()
  })

  it('renders Platform badge for platform_credit', () => {
    render(<ProviderBadge fundingSource="platform_credit" />)
    expect(screen.getByText('Platform')).toBeTruthy()
  })

  it('renders Sponsored badge', () => {
    render(<ProviderBadge fundingSource="sponsored" />)
    expect(screen.getByText('Sponsored')).toBeTruthy()
  })

  it('renders fallback for null', () => {
    render(<ProviderBadge fundingSource={null} />)
    expect(screen.getByText('Unknown')).toBeTruthy()
  })

  it('renders fallback for undefined', () => {
    render(<ProviderBadge fundingSource={undefined} />)
    expect(screen.getByText('Unknown')).toBeTruthy()
  })

  it('renders fallback for unknown funding source', () => {
    render(<ProviderBadge fundingSource="exotic_unknown_source" />)
    expect(screen.getByText('Unknown')).toBeTruthy()
  })

  it('includes title attribute for tooltip', () => {
    const { container } = render(<ProviderBadge fundingSource="platform_credit" />)
    const badge = container.querySelector('[title]')
    expect(badge?.getAttribute('title')).toContain('LenserFight platform credits')
  })

  it('applies className prop', () => {
    const { container } = render(<ProviderBadge fundingSource="platform_credit" className="test-class" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('test-class')
  })
})
