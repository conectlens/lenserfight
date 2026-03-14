import { render } from '@testing-library/react'

import Date from './date'

describe('Date', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Date />)
    expect(baseElement).toBeTruthy()
  })
})
