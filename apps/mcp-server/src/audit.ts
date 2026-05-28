import { SupabaseClient } from '@supabase/supabase-js';

export async function writeAuditLog(
  client: SupabaseClient,
  tool: string,
  result: 'success' | 'error',
  lenserId?: string
): Promise<void> {
  try {
    const { error } = await client
      .schema('audit' as never)
      .from('mcp_tool_calls')
      .insert({
        tool_name: tool,
        result,
        lenser_id: lenserId ?? null,
        called_at: new Date().toISOString(),
      });
    if (error) throw error;
  } catch {
    process.stderr.write(
      `[mcp-audit] ${new Date().toISOString()} tool=${tool} result=${result}\n`
    );
  }
}
