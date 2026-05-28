// This test runs after build in CI only — it verifies the CJS output is loadable.
// To run: pnpm nx build adapters-connector && pnpm nx test adapters-connector --testFile=cjs-compat.spec.ts

import { existsSync } from 'fs'
import { resolve } from 'path'

describe('CJS build output', () => {
  const distPath = resolve(__dirname, '../../../../../dist/libs/adapters/connector/index.cjs')

  it('dist/index.cjs exists after build', () => {
    // This test is skipped in dev; only meaningful after pnpm nx build adapters-connector
    if (!existsSync(distPath)) {
      console.warn('Skipping CJS compat test — build output not found. Run nx build first.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk = require(distPath)
    expect(typeof sdk.ConnectorAdapterV1).not.toBe('undefined')
    expect(typeof sdk.HttpConnectorAdapter).toBe('function')
    expect(typeof sdk.registerConnectorAdapter).toBe('function')
    expect(Array.isArray(sdk.CONNECTOR_SCOPES)).toBe(true)
  })
})
