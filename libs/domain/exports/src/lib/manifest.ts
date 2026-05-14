import { sha256OfString } from './checksum'
import type { ExportFormat, ExportKind, ExportManifest, ExportManifestEntry } from './types'

/**
 * ExportManifestBuilder — Creator pattern.
 *
 * Builds the .manifest.json that ships alongside every export (even
 * single-file exports), so downstream tooling has a uniform contract.
 */
export class ExportManifestBuilder {
  private readonly entries: ExportManifestEntry[] = []
  constructor(
    private readonly exportId: string,
    private readonly createdAt: string = new Date().toISOString(),
  ) {}

  async addEntry(input: {
    kind: ExportKind
    slug: string
    format: ExportFormat
    path: string
    contents: string
  }): Promise<ExportManifestEntry> {
    const bytes = new TextEncoder().encode(input.contents).byteLength
    const sha256 = await sha256OfString(input.contents)
    const entry: ExportManifestEntry = {
      kind: input.kind,
      slug: input.slug,
      format: input.format,
      path: input.path,
      bytes,
      sha256,
    }
    this.entries.push(entry)
    return entry
  }

  build(): ExportManifest {
    return {
      manifestVersion: '1',
      exportId: this.exportId,
      createdAt: this.createdAt,
      entries: [...this.entries].sort((a, b) => a.path.localeCompare(b.path)),
    }
  }
}
