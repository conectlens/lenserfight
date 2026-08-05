import { describe, expect, it } from 'vitest'

import { MentionParser } from './mentionParser'

describe('MentionParser', () => {
  it('parses a plain-text-only string as a single text segment', () => {
    expect(MentionParser.parseSegments('hello world')).toEqual([
      { type: 'text', content: 'hello world' },
    ])
  })

  it('parses @[User:id] and @[Prompt:id] mentions unchanged', () => {
    const segments = MentionParser.parseSegments('hi @[User:u1] check @[Prompt:p1] out')
    expect(segments).toEqual([
      { type: 'text', content: 'hi ' },
      { type: 'mention', entityType: 'User', id: 'u1', original: '@[User:u1]' },
      { type: 'text', content: ' check ' },
      { type: 'mention', entityType: 'Prompt', id: 'p1', original: '@[Prompt:p1]' },
      { type: 'text', content: ' out' },
    ])
  })

  it('parses #[Tag:id] tags unchanged', () => {
    const segments = MentionParser.parseSegments('#[Tag:t1]')
    expect(segments).toEqual([{ type: 'tag', id: 't1', original: '#[Tag:t1]' }])
  })

  it('parses $[Battle:id] battle mentions', () => {
    const segments = MentionParser.parseSegments('check $[Battle:b1] out')
    expect(segments).toEqual([
      { type: 'text', content: 'check ' },
      { type: 'mention', entityType: 'Battle', id: 'b1', original: '$[Battle:b1]' },
      { type: 'text', content: ' out' },
    ])
  })

  it('parses a mix of user, tag, and battle tokens in one string', () => {
    const segments = MentionParser.parseSegments('@[User:u1] #[Tag:t1] $[Battle:b1]')
    expect(segments).toEqual([
      { type: 'mention', entityType: 'User', id: 'u1', original: '@[User:u1]' },
      { type: 'text', content: ' ' },
      { type: 'tag', id: 't1', original: '#[Tag:t1]' },
      { type: 'text', content: ' ' },
      { type: 'mention', entityType: 'Battle', id: 'b1', original: '$[Battle:b1]' },
    ])
  })

  it('creates a battle token in the $[Battle:id] format', () => {
    expect(MentionParser.createBattleToken('b1')).toBe('$[Battle:b1]')
  })

  it('cleanContent strips battle tokens along with other mention tokens', () => {
    expect(MentionParser.cleanContent('see $[Battle:b1] now')).toBe('see  now')
  })
})
