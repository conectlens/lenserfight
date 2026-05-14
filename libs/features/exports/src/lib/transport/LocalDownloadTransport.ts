import { sha256OfString } from '@lenserfight/domain/exports'

import type {
  DeliveredArtifact,
  ExportResult,
  ExportTransport,
  TransportCapabilities,
} from './ExportTransport'

/**
 * LocalDownloadTransport — triggers a browser <a download> save without
 * uploading anything. Same blob path as the cloud transport on the
 * client side; the difference is purely that no signed URL is fetched.
 *
 * Pure Fabrication: this class concentrates the browser-only "save as"
 * mechanism so the orchestrator never touches the DOM directly.
 */
export class LocalDownloadTransport implements ExportTransport {
  readonly id = 'local-download' as const

  capabilities(): TransportCapabilities {
    return {
      availableIn: ['localhost-browser', 'localhost-desktop'],
      label: 'Download to this device',
      description: 'Save the export to your Downloads folder. No upload, no signed URL.',
    }
  }

  async deliver(
    payloads: { serialized: string; filename: string; envelope: { checksum: string } }[],
  ): Promise<ExportResult> {
    const artifacts: DeliveredArtifact[] = []
    for (const p of payloads) {
      const sha = await sha256OfString(p.serialized)
      this.triggerDownload(p.filename, p.serialized)
      artifacts.push({
        filename: p.filename,
        bytes: new TextEncoder().encode(p.serialized).byteLength,
        sha256: sha,
        location: `download:${p.filename}`,
      })
    }
    return { transport: this.id, artifacts }
  }

  private triggerDownload(filename: string, contents: string): void {
    if (typeof document === 'undefined') {
      throw new Error('LocalDownloadTransport: document is required (browser-only)')
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
      // Schedule revoke on next tick so the browser has time to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }
}
