import { render } from '@testing-library/react'

import Types from './types'

describe('Types', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Types />)
    expect(baseElement).toBeTruthy()
  })
})
