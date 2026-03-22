import { render } from '@testing-library/react'

import Lenses from './lenses'

describe('Lenses', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Lenses />)
    expect(baseElement).toBeTruthy()
  })
})
