import { SupabaseClient } from '@supabase/supabase-js';

export async function writeAuditLog(
  _client: SupabaseClient,
  tool: string,
  result: 'success' | 'error',
  lenserId?: string
): Promise<void> {
  process.stderr.write(
    `[mcp-audit] ${new Date().toISOString()} tool=${tool} result=${result}${
      lenserId ? ` lenser=${lenserId}` : ''
    }\n`
  );
}
