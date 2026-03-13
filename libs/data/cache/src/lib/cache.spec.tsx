import { render } from '@testing-library/react'

import Cache from './cache'

describe('Cache', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Cache />)
    expect(baseElement).toBeTruthy()
  })
})
