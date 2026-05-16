import React from 'react'
import ReactDOM from 'react-dom/client'

// i18n must be imported before App so translations are ready on first render
import './i18n'

import App from './App'

// One-time purge of the legacy IndexedDB local-key store. Local BYOK keys now
// live in `~/.lenserfight/keys/` (accessed via the LenserFight Gateway). The
// old browser-encrypted store is obsolete; deleting it prevents stale data
// from masking the new pair-gateway flow and shrinks the in-browser blast
// radius. Idempotent — once the DB is gone, future visits are no-ops.
if (typeof indexedDB !== 'undefined') {
  try {
    indexedDB.deleteDatabase('lenserfight-local-keys')
  } catch {
    // Strict private browsing strips IndexedDB — nothing to clean up.
  }
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)