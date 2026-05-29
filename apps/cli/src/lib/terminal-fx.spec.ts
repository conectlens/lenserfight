import { glitchLine, hackBanner, progressFrame, streamTokenLine } from './terminal-fx'

describe('terminal-fx', () => {
  it('glitchLine is deterministic for a seed', () => {
    expect(glitchLine('run-abc', 20)).toBe(glitchLine('run-abc', 20))
    expect(glitchLine('run-abc', 20)).not.toBe(glitchLine('run-xyz', 20))
  })

  it('hackBanner includes title', () => {
    const lines = hackBanner('workflow-wait')
    expect(lines.join('\n')).toContain('workflow-wait')
    expect(lines.join('\n')).toContain('fsociety')
  })

  it('progressFrame grows with tick', () => {
    expect(progressFrame('wait', 0)).toContain('wait')
    expect(progressFrame('wait', 5)).toContain('█')
  })

  it('streamTokenLine includes provider label', () => {
    expect(streamTokenLine('token', 'hello')).toContain('token')
    expect(streamTokenLine('token', 'hello')).toContain('hello')
  })
})
