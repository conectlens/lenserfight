import { render } from '@testing-library/react'

import Lensers from './lensers'

describe('Lensers', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Lensers />)
    expect(baseElement).toBeTruthy()
  })
})
