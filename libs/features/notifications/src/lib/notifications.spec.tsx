import { render } from '@testing-library/react'

import Notifications from './notifications'

describe('Notifications', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Notifications />)
    expect(baseElement).toBeTruthy()
  })
})
