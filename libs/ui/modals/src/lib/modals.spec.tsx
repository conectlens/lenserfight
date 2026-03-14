import { render } from '@testing-library/react'

import Modals from './modals'

describe('Modals', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Modals />)
    expect(baseElement).toBeTruthy()
  })
})
