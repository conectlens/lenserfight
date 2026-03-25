import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import App from './app'

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    expect(baseElement).toBeTruthy()
  })

  it('should have a greeting as the title', () => {
    const { getAllByText } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    expect(getAllByText(/Creator-first AI battles/i).length > 0).toBeTruthy()
  })
})
