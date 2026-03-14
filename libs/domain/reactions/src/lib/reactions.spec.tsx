import { render } from '@testing-library/react'

import Reactions from './reactions'

describe('Reactions', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Reactions />)
    expect(baseElement).toBeTruthy()
  })
})
