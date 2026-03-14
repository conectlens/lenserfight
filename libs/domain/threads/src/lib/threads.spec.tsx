import { render } from '@testing-library/react'

import Threads from './threads'

describe('Threads', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Threads />)
    expect(baseElement).toBeTruthy()
  })
})
