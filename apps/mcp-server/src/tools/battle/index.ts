import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { registerBattleList } from './battle-list.js';
import { registerBattleGet } from './battle-get.js';
import { registerBattleCreate } from './battle-create.js';
import { registerBattleAddContender } from './battle-add-contender.js';
import { registerBattleSubmitRun } from './battle-submit-run.js';
import { registerBattleScore } from './battle-score.js';
import { registerBattleSetStatus } from './battle-set-status.js';
import { registerBattleHistory } from './battle-history.js';

export function registerBattleTools(server: McpServer, sb: SupabaseClient): void {
  registerBattleList(server, sb);
  registerBattleGet(server, sb);
  registerBattleCreate(server, sb);
  registerBattleAddContender(server, sb);
  registerBattleSubmitRun(server, sb);
  registerBattleScore(server, sb);
  registerBattleSetStatus(server, sb);
  registerBattleHistory(server, sb);
}
