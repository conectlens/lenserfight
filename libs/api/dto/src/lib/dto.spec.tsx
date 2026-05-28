import { render } from '@testing-library/react'

import Dto from './dto'

describe('Dto', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Dto />)
    expect(baseElement).toBeTruthy()
  })
})
