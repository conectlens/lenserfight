import { sha256OfString } from '@lenserfight/domain/exports'
import type { ExportRequest } from '@lenserfight/domain/exports'
import type { ExportsRepositoryPort } from '@lenserfight/data/exports'

import { triggerBrowserDownload } from './browserDownload'
import type {
  DeliveredArtifact,
  ExportResult,
  ExportTransport,
  TransportCapabilities,
} from './ExportTransport'

/**
 * CloudDownloadTransport — saves the export to the user's device.
 *
 * Despite the name, this is a pure client-side download (Blob + <a download>),
 * not a server round-trip. The orchestrator has already:
 *   1. fetched the entity (client-side)
 *   2. minted the envelope, including redaction policy (client-side)
 *   3. serialized it to the chosen format (client-side)
 *
 * By the time bytes reach `deliver()` there is nothing left for the server
 * to do, so we don't call one. Server-side rendering would only be
 * justified for multi-GB exports, bundles, or data that is not on the
 * client — none of which apply to a single battle/lens export.
 *
 * Industry references for this pattern: GitHub diff downloads, Notion
 * page export, Linear CSV export, Figma file export, every "Download
 * JSON" button in modern admin tooling.
 *
 * The `repo` argument is kept for backward compatibility with callers
 * that still pass a SupabaseExportsRepository; it is intentionally
 * unused and will be removed in a future cleanup.
 */
export class CloudDownloadTransport implements ExportTransport {
  readonly id = 'cloud-download' as const

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_repo?: ExportsRepositoryPort) {
    // repo intentionally ignored — see class doc.
  }

  capabilities(): TransportCapabilities {
    return {
      availableIn: ['cloud', 'localhost-browser', 'localhost-desktop'],
      label: 'Download',
      description: 'Save the export to your device. Pure client-side; no upload.',
    }
  }

  async deliver(
    payloads: { envelope: { checksum: string }; serialized: string; filename: string }[],
    _req: ExportRequest,
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
