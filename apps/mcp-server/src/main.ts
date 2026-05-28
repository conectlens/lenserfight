import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConfig } from './config.js';
import { registerLensTools } from './tools/lens/index.js';
import { registerBattleTools } from './tools/battle/index.js';
import { registerWorkflowTools } from './tools/workflow/index.js';
import { bootStdio } from './transport/stdio.js';
import { bootHttp } from './transport/http.js';

async function main(): Promise<void> {
  const cfg = getConfig();

  const server = new McpServer({
    name: 'lenserfight',
    version: '1.0.0',
  });

  registerLensTools(server);
  registerBattleTools(server);
  registerWorkflowTools(server);

  if (cfg.transport === 'http') {
    await bootHttp(server, cfg);
  } else {
    await bootStdio(server);
  }
}

main().catch((err) => {
  process.stderr.write(`[lenserfight-mcp] Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
