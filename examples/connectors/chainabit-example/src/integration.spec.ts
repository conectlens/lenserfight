// @integration — Chainabit connector end-to-end test.
//
// Requires real environment variables to run. Skipped automatically when
// CHAINABIT_API_URL is not set, so it never blocks CI for developers who
// haven't configured a Chainabit backend.
//
// To run:
//   CHAINABIT_API_URL=https://... LENSERFIGHT_SERVICE_TOKEN=... \
//   LENSERFIGHT_CONNECTOR_ENDPOINT=https://... \
//   pnpm jest examples/connectors/chainabit-example/src/integration.spec.ts

import { createChainabitAdapter } from './adapter'

const CHAINABIT_API_URL      = process.env['CHAINABIT_API_URL']
const SERVICE_TOKEN          = process.env['LENSERFIGHT_SERVICE_TOKEN'] ?? 'test-token'
const CONNECTOR_ENDPOINT     = process.env['LENSERFIGHT_CONNECTOR_ENDPOINT'] ?? 'http://localhost:3001/webhooks/connector'

const runIntegration = CHAINABIT_API_URL ? describe : describe.skip

runIntegration('Chainabit connector adapter (integration)', () => {
  const adapter = createChainabitAdapter({
    serviceToken: SERVICE_TOKEN,
    endpoint: CONNECTOR_ENDPOINT,
  })

  it('verify — returns ok: true for a valid service token', async () => {
    const result = await adapter.verify(SERVICE_TOKEN)
    expect(result.ok).toBe(true)
  }, 15_000)

  it('dispatch — submits a job event and receives an acknowledgement', async () => {
    const result = await adapter.dispatch({
      type: 'job.submitted',
      payload: {
        jobId:    `integration-test-${Date.now()}`,
        prompt:   'Hello from integration test',
        provider: 'openai',
        model:    'gpt-4o-mini',
      },
    })
    expect(result.ok).toBe(true)
  }, 20_000)
})
