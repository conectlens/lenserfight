
export type MentionType = 'Prompt' | 'User' | 'Thread';

export interface MentionToken {
  type: 'mention';
  entityType: MentionType;
  id: string;
  original: string;
}

export interface TextToken {
  type: 'text';
  content: string;
}

export type ContentSegment = MentionToken | TextToken;

export class MentionParser {
  // Regex captures: 1=Type, 2=ID
  private static readonly TOKEN_PATTERN = /@\[(Prompt|User|Thread):([a-zA-Z0-9-]+)\]/g;

  /**
   * Parses raw content string into an array of segments (text and tokens).
   * Does not perform any data fetching.
   */
  static parseSegments(content: string): ContentSegment[] {
    if (!content) return [];

    const segments: ContentSegment[] = [];
    let lastIndex = 0;
    let match;

    // Reset stateful regex
    this.TOKEN_PATTERN.lastIndex = 0;

    while ((match = this.TOKEN_PATTERN.exec(content)) !== null) {
      // Push preceding text if any
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }

      // Push mention token
      segments.push({
        type: 'mention',
        entityType: match[1] as MentionType,
        id: match[2],
        original: match[0]
      });

      lastIndex = this.TOKEN_PATTERN.lastIndex;
    }

    // Push remaining text
    if (lastIndex < content.length) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    return segments;
  }

  /**
   * Extracts the first Prompt ID found in the content.
   * Useful for metadata preview cards.
   */
  static extractPromptId(content: string): string | null {
    const match = content.match(/@\[Prompt:([a-zA-Z0-9-]+)\]/);
    return match ? match[1] : null;
  }

  /**
   * Removes mention tokens from the content for cleaner plain-text display (e.g. SEO descriptions).
   */
  static cleanContent(content: string): string {
    return content.replace(this.TOKEN_PATTERN, '').trim();
  }

  /**
   * Generates a structured token string.
   */
  static createPromptToken(id: string): string {
    return `@[Prompt:${id}]`;
  }
}
