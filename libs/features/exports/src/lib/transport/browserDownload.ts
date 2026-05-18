/**
 * Browser file save — the sector-standard "Save As" mechanism.
 *
 * Pattern: Blob → URL.createObjectURL → synthetic <a download> click →
 * revokeObjectURL on next tick. Used by every modern file-export UI
 * (GitHub diff downloads, Notion exports, Figma exports, Linear CSV,
 * Google Drive desktop downloads, etc.). It does not hit the network,
 * does not require server signing, and works offline.
 *
 * Pure Fabrication (GRASP): concentrates the DOM-only save mechanism
 * so transports never touch document/Blob/URL directly.
 */
export function triggerBrowserDownload(filename: string, contents: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('triggerBrowserDownload: document/URL required (browser-only)')
  }
  const blob = new Blob([contents], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // Defer revoke so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
