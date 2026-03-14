import { render } from '@testing-library/react'

import Prompts from './prompts'

describe('Prompts', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Prompts />)
    expect(baseElement).toBeTruthy()
  })
})
