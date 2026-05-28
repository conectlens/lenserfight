import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBattleList } from './battle-list.js';
import { registerBattleGet } from './battle-get.js';
import { registerBattleCreate } from './battle-create.js';
import { registerBattleAddContender } from './battle-add-contender.js';
import { registerBattleSubmitRun } from './battle-submit-run.js';
import { registerBattleScore } from './battle-score.js';
import { registerBattleSetStatus } from './battle-set-status.js';
import { registerBattleHistory } from './battle-history.js';

export function registerBattleTools(server: McpServer): void {
  registerBattleList(server);
  registerBattleGet(server);
  registerBattleCreate(server);
  registerBattleAddContender(server);
  registerBattleSubmitRun(server);
  registerBattleScore(server);
  registerBattleSetStatus(server);
  registerBattleHistory(server);
}
