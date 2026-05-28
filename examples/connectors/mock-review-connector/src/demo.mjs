import { createMockReviewConnector, VALID_TOKEN } from './index.mjs'

const connector = createMockReviewConnector()

console.log('adapter:', connector.id())
console.log('metadata:', connector.metadata())
console.log('verify:', await connector.verify(VALID_TOKEN))
console.log(
  'dispatch:',
  await connector.dispatch({
    type: 'lens.published',
    payload: {
      lens_id: 'lens_example_configured_review',
      version: '0.1.0',
    },
  })
)
console.log('received:', connector.received())
