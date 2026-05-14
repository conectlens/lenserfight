import {
  buildExportFilename,
  ExportEnvelopeFactory,
  ExportValidationError,
  type ExportContext,
  type ExportEnvelope,
  type ExportRequest,
} from '@lenserfight/domain/exports'
import type { SerializerRegistry } from '@lenserfight/shared/serializers'

import type { ExportResult, ExportTransport } from '../transport/ExportTransport'

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
    private readonly registry: SerializerRegistry,
    private readonly envelopeFactory: ExportEnvelopeFactory = new ExportEnvelopeFactory(),
  ) {}

  async run<T>(input: {
    request: ExportRequest
    ctx: ExportContext
    fetchPayload: () => Promise<T>
    transport: ExportTransport
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
    const filename = buildExportFilename({ slug: request.slug, format: request.format })
    return transport.deliver(
      [{ envelope: envelope as ExportEnvelope<unknown>, serialized, filename }],
      request,
    )
  }
}
