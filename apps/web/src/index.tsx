import React from 'react'
import ReactDOM from 'react-dom/client'

// i18n must be imported before App so translations are ready on first render
import './i18n'

import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)