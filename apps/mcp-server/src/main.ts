import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config.js';
import { getServiceClient } from './client.js';
import { registerLensTools } from './tools/lens/index.js';
import { registerBattleTools } from './tools/battle/index.js';
import { registerWorkflowTools } from './tools/workflow/index.js';
import { registerAgentTools } from './tools/agent/index.js';
import { bootStdio } from './transport/stdio.js';
import { bootHttp } from './transport/http.js';

export function buildServer(sb: SupabaseClient): McpServer {
  const server = new McpServer({
    name: 'lenserfight',
    version: '1.0.0',
  });

  registerLensTools(server, sb);
  registerBattleTools(server, sb);
  registerWorkflowTools(server, sb);
  registerAgentTools(server, sb);

  return server;
}

async function main(): Promise<void> {
  const cfg = getConfig();

  if (cfg.transport === 'http') {
    // HTTP mode: per-session servers are created in bootHttp; pass a factory
    await bootHttp(buildServer, cfg);
  } else {
    // stdio mode: single service-role client (admin/local dev)
    const server = buildServer(getServiceClient());
    await bootStdio(server);
  }
}

main().catch((err) => {
  process.stderr.write(`[lenserfight-mcp] Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
