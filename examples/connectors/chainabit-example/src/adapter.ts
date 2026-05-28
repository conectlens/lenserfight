import {
  CONNECTOR_SCOPES,
  type ConnectorAdapterV1,
  type ConnectorMetadata,
  type DispatchEvent,
  type DispatchResult,
  HttpConnectorAdapter,
  type VerifyResult,
} from '@lenserfight/adapters-connector'

/**
 * Reference adapter for the `chainabit` connector. Wraps the built-in
 * HttpConnectorAdapter and demonstrates how an external integration can
 * register itself in the connector registry.
 */
export function createChainabitAdapter(opts: {
  serviceToken: string
  endpoint: string
}): ConnectorAdapterV1 {
  const metadata: ConnectorMetadata = {
    slug: 'chainabit',
    name: 'Chainabit Reference',
    kind: 'api',
    scopes: [CONNECTOR_SCOPES[0]],
    isActive: true,
    description: 'OSS reference adapter — copy and adapt for your own integration.',
  }

  const inner = new HttpConnectorAdapter({
    metadata,
    endpoint: opts.endpoint,
    serviceToken: opts.serviceToken,
  })

  return {
    id: () => 'chainabit',
    metadata: () => metadata,
    verify: (token: string): Promise<VerifyResult> => inner.verify(token),
    dispatch: (event: DispatchEvent): Promise<DispatchResult> => inner.dispatch(event),
  }
}
