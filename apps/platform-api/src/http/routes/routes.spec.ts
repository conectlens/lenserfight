import { parseLensExecuteRequest, parseWorkflowRunRequest } from '@lenserfight/api/dto'

describe('platform-api dto parsing', () => {
  it('accepts a valid lens execute request', () => {
    expect(parseLensExecuteRequest({
      params: { topic: 'LenserFight' },
      fundingSource: 'platform_credit',
    })).toEqual({
      params: { topic: 'LenserFight' },
      fundingSource: 'platform_credit',
      modelOverride: undefined,
      providerOverride: undefined,
      byokKeyRefId: undefined,
      idempotencyKey: undefined,
    })
  })

  it('rejects an invalid workflow payload', () => {
    expect(() => parseWorkflowRunRequest({ inputs: [] })).toThrow('`inputs` must be an object.')
  })
})
