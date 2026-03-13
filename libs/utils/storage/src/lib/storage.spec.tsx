import { render } from '@testing-library/react'

import Storage from './storage'

describe('Storage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Storage />)
    expect(baseElement).toBeTruthy()
  })
})
