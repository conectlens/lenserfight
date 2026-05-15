import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleGuard } from './LocaleGuard'
import { UnprefixedRedirect } from './UnprefixedRedirect'
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
          <Route path="policies/terms" element={<LocationProbe />} />
        </Route>
        <Route path="*" element={<UnprefixedRedirect />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UnprefixedRedirect', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('redirects bare /about to /<default>/about when nothing is stored', () => {
    renderAt('/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/en/about')
  })

  it('uses the stored locale when it is enabled', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'tr')
    renderAt('/about')
    expect(screen.getByTestId('pathname').textContent).toBe('/tr/about')
  })

  it('falls back to default when the stored locale is a stub', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'pt')
    renderAt('/policies/terms')
    expect(screen.getByTestId('pathname').textContent).toBe('/en/policies/terms')
  })

  it('does NOT overwrite localStorage on auto-redirect through LocaleGuard', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'pt')
    renderAt('/about')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt')
  })

  it('redirects bare root / to /<default>', () => {
    renderAt('/')
    expect(screen.getByTestId('pathname').textContent).toBe('/en')
  })
})
