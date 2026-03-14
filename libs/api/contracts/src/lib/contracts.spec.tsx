import { render } from '@testing-library/react'

import Contracts from './contracts'

describe('Contracts', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Contracts />)
    expect(baseElement).toBeTruthy()
  })
})
