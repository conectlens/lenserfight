import { render } from '@testing-library/react'

import Moderation from './moderation'

describe('Moderation', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Moderation />)
    expect(baseElement).toBeTruthy()
  })
})
