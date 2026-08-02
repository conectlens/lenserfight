import {
  ExportOrchestrator,
  MemoryTransport,
  type ExportContext,
  type ExportFormat,
  type ExportKind,
} from '@lenserfight/domain/exports';
import { bootstrapSerializers, getDefaultRegistry } from '@lenserfight/shared/serializers';
import { SupabaseClient } from '@supabase/supabase-js';

import { McpError } from '../services/mcp-error.js';

import type { RpcCaller } from '@lenserfight/api/export-payloads';

/** Adapts this server's SupabaseClient.rpc to the RpcCaller shape shared
 * with the CLI's export commands (see libs/api/export-payloads). */
export function sbRpcCaller(sb: SupabaseClient): RpcCaller {
  return async <T = unknown>(fn: string, params: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn as never, params as never);
    if (error) throw new McpError('DB_ERROR', (error as { message: string }).message);
    return data as T;
  };
}

export interface McpExportResult {
  content: string;
  filename: string;
  checksum: string;
}

/** Runs the shared ExportOrchestrator against an already-fetched payload and
 * captures its serialized output via MemoryTransport — the same orchestrator
 * and serializer registry the CLI's export commands use. */
export async function runMcpExport<T>(
  kind: ExportKind,
  slug: string,
  title: string | null | undefined,
  payload: T,
  format: ExportFormat,
  userId: string | undefined
): Promise<McpExportResult> {
  const registry = bootstrapSerializers(getDefaultRegistry());
  const orchestrator = new ExportOrchestrator(registry);
  const transport = new MemoryTransport();
  const ctx: ExportContext = {
    userId: userId ?? null,
    tenantId: null,
    via: 'api',
    host: 'mcp',
    // None of Lens/Workflow/Agent's export payload shapes carry an owner
    // field to compare against — the RPCs themselves (RLS-scoped to the
    // caller's session) are the real authorization boundary. Treat a
    // resolved userId as owner-equivalent for the export-time redaction
    // pass, a defense-in-depth layer on top of that.
    isOwner: Boolean(userId),
    isAuthenticated: Boolean(userId),
  };

  await orchestrator.run({
    request: { kind, slug, format },
    ctx,
    fetchPayload: async () => payload,
    transport,
    title,
  });

  const captured = transport.captured[0];
  if (!captured) throw new McpError('EXPORT_FAILED', 'Export produced no output');
  return {
    content: captured.serialized,
    filename: captured.filename,
    checksum: captured.envelope.checksum,
  };
}
