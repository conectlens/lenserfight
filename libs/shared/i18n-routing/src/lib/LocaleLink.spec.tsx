import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LocaleLink } from './LocaleLink'

function renderInLocale(locale: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[`/${locale}/`]}>
      <Routes>
        <Route path=":lang/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LocaleLink', () => {
  it('prefixes absolute paths with the active locale', () => {
    renderInLocale('tr', <LocaleLink to="/about">About</LocaleLink>)
    const link = screen.getByRole('link', { name: 'About' })
    expect(link.getAttribute('href')).toBe('/tr/about')
  })

  it('replaces an existing locale prefix on the target path', () => {
    renderInLocale('tr', <LocaleLink to="/en/about">About</LocaleLink>)
    const link = screen.getByRole('link', { name: 'About' })
    expect(link.getAttribute('href')).toBe('/tr/about')
  })

  it('passes through relative paths unchanged', () => {
    renderInLocale('tr', <LocaleLink to="settings">Settings</LocaleLink>)
    const link = screen.getByRole('link', { name: 'Settings' })
    expect(link.getAttribute('href')).toMatch(/settings$/)
  })

  it('renders external URLs as <a> with href untouched', () => {
    renderInLocale(
      'en',
      <LocaleLink to="https://docs.lenserfight.com">Docs</LocaleLink>,
    )
    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link.getAttribute('href')).toBe('https://docs.lenserfight.com')
  })

  it('renders mailto links as <a> with href untouched', () => {
    renderInLocale(
      'en',
      <LocaleLink to="mailto:hi@example.com">Email</LocaleLink>,
    )
    expect(screen.getByRole('link', { name: 'Email' }).getAttribute('href')).toBe(
      'mailto:hi@example.com',
    )
  })
})
