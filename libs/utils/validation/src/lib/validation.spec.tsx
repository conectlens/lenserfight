import { render } from '@testing-library/react'

import Validation from './validation'

describe('Validation', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Validation />)
    expect(baseElement).toBeTruthy()
  })
})
