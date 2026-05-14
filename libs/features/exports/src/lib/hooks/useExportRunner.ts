import { useCallback } from 'react'

import {
  bootstrapSerializers,
  getDefaultRegistry,
} from '@lenserfight/shared/serializers'
import type {
  ExportContext,
  ExportFormat,
  ExportKind,
  ExportRequest,
} from '@lenserfight/domain/exports'

import { ExportOrchestrator } from '../orchestrator/ExportOrchestrator'
import type { ExportTransport } from '../transport/ExportTransport'

/**
 * Wires the orchestrator with the default serializer registry. Caller
 * supplies the runtime-dependent transport + context. Keeps each render
 * free of orchestrator-construction overhead.
 */
export interface UseExportRunnerArgs<T> {
  kind: ExportKind
  slug: string
  fetchPayload: () => Promise<T>
  buildContext: () => Promise<ExportContext> | ExportContext
  resolveTransport: (id: 'cloud-download' | 'local-download' | 'local-workspace') => ExportTransport
}

export function useExportRunner<T>(args: UseExportRunnerArgs<T>) {
  const { kind, slug, fetchPayload, buildContext, resolveTransport } = args

  return useCallback(
    async ({
      format,
      destination,
    }: {
      format: ExportFormat
      destination: 'cloud-download' | 'local-download' | 'local-workspace'
    }) => {
      const registry = bootstrapSerializers(getDefaultRegistry())
      const orchestrator = new ExportOrchestrator(registry)
      const transport = resolveTransport(destination)
      const request: ExportRequest = { kind, slug, format }
      const ctx = await buildContext()
      return orchestrator.run<T>({ request, ctx, fetchPayload, transport })
    },
    [kind, slug, fetchPayload, buildContext, resolveTransport],
  )
}
