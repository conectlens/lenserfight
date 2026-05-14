import { sha256OfString } from '@lenserfight/domain/exports'
import type { ExportRequest } from '@lenserfight/domain/exports'
import type { ExportsRepositoryPort } from '@lenserfight/data/exports'

import type {
  DeliveredArtifact,
  ExportResult,
  ExportTransport,
  TransportCapabilities,
} from './ExportTransport'

/**
 * CloudDownloadTransport — uploads the request to the exports-build edge
 * function and returns the signed URL the user clicks to download.
 *
 * Indirection (GRASP): the edge URL / bucket layout is hidden behind
 * ExportsRepositoryPort; the transport never knows where the bytes
 * actually live.
 */
export class CloudDownloadTransport implements ExportTransport {
  readonly id = 'cloud-download' as const

  constructor(private readonly repo: ExportsRepositoryPort) {}

  capabilities(): TransportCapabilities {
    return {
      availableIn: ['cloud', 'localhost-browser', 'localhost-desktop'],
      label: 'Download from cloud',
      description:
        'Render server-side, sign a 10-minute URL, then download. Required for non-owner exports of other users’ content.',
    }
  }

  async deliver(
    payloads: { envelope: { checksum: string }; serialized: string; filename: string }[],
    req: ExportRequest,
  ): Promise<ExportResult> {
    // EX-1: single-file requests only. Bulk + bundle land in EX-2.
    const job = await this.repo.enqueue({
      kind: req.kind,
      slug: req.slug,
      format: req.format,
      oneShot: req.oneShot,
      nonce: req.nonce,
    })
    const artifacts: DeliveredArtifact[] = []
    for (const p of payloads) {
      const sha = await sha256OfString(p.serialized)
      artifacts.push({
        filename: p.filename,
        bytes: new TextEncoder().encode(p.serialized).byteLength,
        sha256: sha,
        location: job.signedUrl ?? `job:${job.id}`,
      })
    }
    return { transport: this.id, artifacts }
  }
}
