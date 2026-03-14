import { render } from '@testing-library/react'

import Analytics from './analytics'

describe('Analytics', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Analytics />)
    expect(baseElement).toBeTruthy()
  })
})
