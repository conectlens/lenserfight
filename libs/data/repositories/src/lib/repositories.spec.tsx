import { render } from '@testing-library/react'

import Repositories from './repositories'

describe('Repositories', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Repositories />)
    expect(baseElement).toBeTruthy()
  })
})
