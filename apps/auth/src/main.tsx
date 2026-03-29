import { StrictMode } from 'react'
import * as ReactDOM from 'react-dom/client'
import './styles.css'
import App from './app/app'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
