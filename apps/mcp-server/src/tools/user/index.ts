import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { registerUserGetMe } from './user-get-me.js';

export function registerUserTools(server: McpServer, sb: SupabaseClient, lenserId?: string): void {
  registerUserGetMe(server, sb, lenserId);
}
