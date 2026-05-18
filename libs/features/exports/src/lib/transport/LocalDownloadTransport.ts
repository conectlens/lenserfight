import { sha256OfString } from '@lenserfight/domain/exports'

import { triggerBrowserDownload } from './browserDownload'
import type {
  DeliveredArtifact,
  ExportResult,
  ExportTransport,
  TransportCapabilities,
} from './ExportTransport'

/**
 * LocalDownloadTransport — triggers a browser <a download> save without
 * uploading anything. Identical client-side mechanism to
 * CloudDownloadTransport; the two are distinct only so the
 * DestinationSelector can surface different labels per runtime mode.
 *
 * Pure Fabrication (GRASP): keeps DOM-only "save as" concentrated in
 * the transport layer; orchestrator never touches the DOM.
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
      triggerBrowserDownload(p.filename, p.serialized)
      artifacts.push({
        filename: p.filename,
        bytes: new TextEncoder().encode(p.serialized).byteLength,
        sha256: sha,
        location: `download:${p.filename}`,
      })
    }
    return { transport: this.id, artifacts }
  }
}
