import { registerConnectorAdapter, getConnectorAdapter } from '@lenserfight/adapters-connector'

import { createChainabitAdapter } from './adapter'

const serviceToken = process.env.LENSERFIGHT_SERVICE_TOKEN
const endpoint = process.env.LENSERFIGHT_CONNECTOR_ENDPOINT

if (!serviceToken) {
  console.error(
    'Missing LENSERFIGHT_SERVICE_TOKEN. Run: lenserfight connectors add chainabit --scopes lenses:read',
  )
  process.exit(1)
}

if (!endpoint) {
  console.error('Missing LENSERFIGHT_CONNECTOR_ENDPOINT. Set a webhook target in .env.')
  process.exit(1)
}

registerConnectorAdapter('chainabit', () =>
  createChainabitAdapter({ serviceToken, endpoint }),
)

const adapter = getConnectorAdapter('chainabit')

const verifyResult = await adapter.verify(serviceToken)
console.log('verify:', verifyResult)

const dispatchResult = await adapter.dispatch({
  type: 'lens.published',
  payload: { id: 'lens_demo', timestamp: new Date().toISOString() },
})
console.log('dispatch:', dispatchResult)

if (!verifyResult.ok) process.exit(2)
if (!dispatchResult.ok) process.exit(3)
