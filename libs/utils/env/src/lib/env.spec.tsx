import { render } from '@testing-library/react'

import Env from './env'

describe('Env', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Env />)
    expect(baseElement).toBeTruthy()
  })
})
