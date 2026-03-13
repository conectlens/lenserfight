import { render } from '@testing-library/react'

import Supabase from './supabase'

describe('Supabase', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Supabase />)
    expect(baseElement).toBeTruthy()
  })
})
