import { render } from '@testing-library/react'

import Forms from './forms'

describe('Forms', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Forms />)
    expect(baseElement).toBeTruthy()
  })
})
