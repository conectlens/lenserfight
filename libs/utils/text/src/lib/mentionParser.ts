export type MentionType = 'Prompt' | 'User' | 'Thread'

export interface MentionToken {
  type: 'mention'
  entityType: MentionType
  id: string
  original: string
}

export interface TagToken {
  type: 'tag'
  id: string
  original: string
}

export interface TextToken {
  type: 'text'
  content: string
}

export type ContentSegment = MentionToken | TagToken | TextToken

export class MentionParser {
  // Regex captures: 1=Type, 2=ID
  private static readonly TOKEN_PATTERN = /@\[(Prompt|User|Thread):([a-zA-Z0-9-]+)\]/g
  private static readonly TAG_TOKEN_PATTERN = /#\[Tag:([a-zA-Z0-9-]+)\]/g

  /**
   * Parses raw content string into an array of segments (text, mention, and tag tokens).
   * Does not perform any data fetching.
   */
  static parseSegments(content: string): ContentSegment[] {
    if (!content) return []

    // Combined regex that matches both @[...] and #[Tag:...] tokens
    const combined = /(@\[(Prompt|User|Thread):([a-zA-Z0-9-]+)\])|(#\[Tag:([a-zA-Z0-9-]+)\])/g

    const segments: ContentSegment[] = []
    let lastIndex = 0
    let match

    combined.lastIndex = 0

    while ((match = combined.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      }

      if (match[1]) {
        // @[Type:id] mention
        segments.push({
          type: 'mention',
          entityType: match[2] as MentionType,
          id: match[3],
          original: match[1],
        })
      } else if (match[4]) {
        // #[Tag:id] tag
        segments.push({
          type: 'tag',
          id: match[5],
          original: match[4],
        })
      }

      lastIndex = combined.lastIndex
    }

    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) })
    }

    return segments
  }

  /**
   * Extracts the first Prompt ID found in the content.
   * Useful for metadata preview cards.
   */
  static extractPromptId(content: string): string | null {
    const match = content.match(/@\[Prompt:([a-zA-Z0-9-]+)\]/)
    return match ? match[1] : null
  }

  /**
   * Removes mention tokens from the content for cleaner plain-text display (e.g. SEO descriptions).
   */
  static cleanContent(content: string): string {
    return content.replace(this.TOKEN_PATTERN, '').trim()
  }

  /**
   * Generates a structured token string.
   */
  static createPromptToken(id: string): string {
    return `@[Prompt:${id}]`
  }
}
