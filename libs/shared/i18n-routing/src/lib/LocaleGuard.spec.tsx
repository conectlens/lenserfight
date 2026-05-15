import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleGuard } from './LocaleGuard'
import { LOCALE_STORAGE_KEY } from './constants'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="pathname">{location.pathname}</div>
}

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path=":lang" element={<LocaleGuard />}>
          <Route index element={<LocationProbe />} />
          <Route path="about" element={<LocationProbe />} />
        </Route>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LocaleGuard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('renders the child route when :lang is enabled', () => {
    renderAt('/en/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/en/about')
  })

  it('redirects to the detected locale when :lang is invalid (prepends, does not strip)', () => {
    renderAt('/xyz/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/en/xyz/about')
  })

  it('redirects to the detected locale when :lang is a stub locale', () => {
    renderAt('/es/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/en/es/about')
  })

  it('uses stored locale (when enabled) as redirect target', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'tr')
    renderAt('/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/tr/about')
  })

  it('sets document.documentElement.lang on render', () => {
    renderAt('/tr')
    expect(document.documentElement.lang).toBe('tr')
  })

  it('sets document.documentElement.dir on render', () => {
    renderAt('/tr')
    expect(document.documentElement.dir).toBe('ltr')
  })
})
