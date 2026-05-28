import { render } from '@testing-library/react'

import Theme from './theme'

describe('Theme', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Theme />)
    expect(baseElement).toBeTruthy()
  })
})
