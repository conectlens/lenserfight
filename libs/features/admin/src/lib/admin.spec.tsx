import { render } from '@testing-library/react'

import Admin from './admin'

describe('Admin', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Admin />)
    expect(baseElement).toBeTruthy()
  })
})
