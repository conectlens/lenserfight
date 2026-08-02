import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'


import { callRpc, getUserInfo, isAuthenticated } from '@lenserfight/cli-client'
import {
  ExportOrchestrator,
  MemoryTransport,
  type ExportContext,
  type ExportFormat,
  type ExportKind,
} from '@lenserfight/domain/exports'
import { bootstrapSerializers, getDefaultRegistry } from '@lenserfight/shared/serializers'
import consola from 'consola'

/** Adapts the CLI's generic authenticated RPC caller to the RpcCaller shape
 * shared with the MCP server's export tools (see libs/api/export-payloads). */
export const cliRpcCaller = <T = unknown>(
  fn: string,
  params: Record<string, unknown>
): Promise<T> => callRpc<T>(fn, params, { requireAuth: true })

async function buildCliExportContext(): Promise<ExportContext> {
  const authed = isAuthenticated()
  const user = authed ? await getUserInfo() : null
  const userId = (user?.['id'] as string | undefined) ?? null
  return {
    userId,
    tenantId: null,
    via: 'cli',
    host: 'cli',
    // None of Lens/Workflow/Agent's export payload shapes carry an owner
    // field to compare against — the RPCs themselves are the real
    // authorization boundary (RLS-scoped to what this session can fetch
    // at all). Treat an authenticated session as owner-equivalent for the
    // export-time redaction pass, which is a defense-in-depth layer on
    // top of that, not the primary gate.
    isOwner: authed,
    isAuthenticated: authed,
  }
}

export interface CliExportResult {
  content: string
  filename: string
}

/** Runs the shared ExportOrchestrator against an already-fetched payload and
 * captures its serialized output via MemoryTransport — the same orchestrator
 * and serializer registry the MCP server's export tools use. */
export async function runCliExport<T>(
  kind: ExportKind,
  slug: string,
  title: string | null | undefined,
  payload: T,
  format: ExportFormat
): Promise<CliExportResult> {
  const registry = bootstrapSerializers(getDefaultRegistry())
  const orchestrator = new ExportOrchestrator(registry)
  const transport = new MemoryTransport()
  const ctx = await buildCliExportContext()

  await orchestrator.run({
    request: { kind, slug, format },
    ctx,
    fetchPayload: async () => payload,
    transport,
    title,
  })

  const captured = transport.captured[0]
  if (!captured) throw new Error('Export produced no output')
  return { content: captured.serialized, filename: captured.filename }
}

/** Writes export content to --out, or stdout when no path was given. */
export function writeExportOutput(content: string, outPath: string | undefined): void {
  if (outPath) {
    writeFileSync(resolve(outPath), content, 'utf-8')
    consola.success('Exported to %s', outPath)
  } else {
    process.stdout.write(content)
  }
}
