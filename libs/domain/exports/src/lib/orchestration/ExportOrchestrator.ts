import { buildExportFilename } from '../slug'
import { ExportEnvelopeFactory } from '../envelope'
import { ExportValidationError } from '../errors'
import type {
  ExportContext,
  ExportEnvelope,
  ExportFormat,
  ExportKind,
  ExportRequest,
  ExportVisibility,
  ValidationResult,
} from '../types'

import type { ExportResult, ExportTransport } from './ExportTransport'

/**
 * SerializerPort / SerializerRegistryPort — Dependency Inversion (GRASP:
 * Indirection + Protected Variations).
 *
 * The orchestrator lives in the domain layer and must not import the
 * concrete `SerializerRegistry`/`Serializer` types from
 * `@lenserfight/shared/serializers` — that package's adapters already
 * import envelope types from here, so a concrete import back would form
 * a circular dependency. These structural ports capture exactly the
 * shape the orchestrator needs; `SerializerRegistry` satisfies
 * `SerializerRegistryPort` automatically (TypeScript structural typing),
 * no explicit `implements` or import required on either side.
 */
export interface SerializerPort {
  serialize(
    envelope: ExportEnvelope<unknown>,
    ctx: { visibility: ExportVisibility; locale?: string },
  ): Promise<string>
  validate(output: string): Promise<ValidationResult>
}

export interface SerializerRegistryPort {
  resolve(kind: ExportKind, format: ExportFormat): SerializerPort
}

/**
 * ExportOrchestrator — Controller (GRASP).
 *
 * The single coordinator of an export use case. Knows how to:
 *   1. mint the envelope (delegates to ExportEnvelopeFactory)
 *   2. resolve the right serializer (delegates to the registry)
 *   3. run validation
 *   4. hand off bytes to the chosen transport
 *
 * Never touches: fetch, FS, DOM, Supabase. All of those are behind
 * interfaces. Tests can drive it with in-memory fakes for everything.
 */
export class ExportOrchestrator {
  constructor(
    private readonly registry: SerializerRegistryPort,
    private readonly envelopeFactory: ExportEnvelopeFactory = new ExportEnvelopeFactory(),
  ) {}

  async run<T>(input: {
    request: ExportRequest
    ctx: ExportContext
    fetchPayload: () => Promise<T>
    transport: ExportTransport
    /** Human-readable title; preferred over `request.slug` for the filename. */
    title?: string | null
  }): Promise<ExportResult> {
    const { request, ctx, fetchPayload, transport } = input
    const data = await fetchPayload()
    const envelope: ExportEnvelope<T> = await this.envelopeFactory.build({
      kind: request.kind,
      data,
      ctx,
    })
    const serializer = this.registry.resolve(request.kind, request.format)
    const serialized = await serializer.serialize(envelope, {
      visibility: envelope.visibility,
    })
    const validation = await serializer.validate(serialized)
    if (!validation.ok) throw new ExportValidationError(validation.issues)
    const filenameBasis = pickFilenameBasis(input.title, request.slug)
    const filename = buildExportFilename({ slug: filenameBasis, format: request.format })
    return transport.deliver(
      [{ envelope: envelope as ExportEnvelope<unknown>, serialized, filename }],
      request,
    )
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pickFilenameBasis(title: string | null | undefined, slug: string): string {
  const titleTrimmed = (title ?? '').trim()
  if (titleTrimmed.length > 0) return titleTrimmed
  if (UUID_RE.test(slug.trim())) return 'export'
  return slug
}
