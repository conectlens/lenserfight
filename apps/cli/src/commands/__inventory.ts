import { defineCommand } from 'citty'

import { buildCommandInventory } from '../lib/command-inventory'

/**
 * Hidden diagnostic command — dumps the full command inventory as JSON.
 * Not documented/discoverable; exists so tooling (the command-sweep CSV
 * report, and previously only the in-process dashboard) can get the
 * canonical leaf-command list without importing main.ts's ESM chain
 * directly, which citty's bundled dependencies choke on under ts-jest's
 * CommonJS transform.
 */
export default defineCommand({
  meta: { name: '__inventory', description: 'internal: dump the command inventory as JSON' },
  args: {},
  async run() {
    const inventory = await buildCommandInventory()
    process.stdout.write(JSON.stringify(inventory))
  },
})
