import { GoogleGenAI } from '@google/genai'

import { ModerationPolicy, ModerationResult } from '../../types/moderation.types'

/**
 * 1. Dictionary Policy with Leetspeak Normalization
 * Deterministic check for known profanity.
 */
export class DictionaryPolicy implements ModerationPolicy {
  name = 'DictionaryCheck'

  // A minimal base set. In a real app, this would be loaded from a large JSON/CDN.
  private blocklist = new Set([
    'badword',
    'hate',
    'scam',
    'sh1t',
    'f*ck',
    'abuse', // Placeholder examples
  ])

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/@/g, 'a')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/0/g, 'o')
      .replace(/5/g, 's')
      .replace(/[$]/g, 's')
      .replace(/[^a-z]/g, '') // Strip non-alpha for strict checking
  }

  async check(text: string): Promise<ModerationResult> {
    const normalized = this.normalize(text)

    // Check for substrings or exact words.
    // For this simple implementation, we check if the normalized string *contains* a blocked term.
    for (const word of this.blocklist) {
      if (normalized.includes(word)) {
        return {
          status: 'rejected',
          reason: 'Contains prohibited language.',
          confidence: 1.0,
          policyName: this.name,
        }
      }
    }

    return { status: 'approved', confidence: 1.0, policyName: this.name }
  }
}

/**
 * 2. Regex Policy
 * Deterministic check for PII or specific patterns.
 */
export class RegexPolicy implements ModerationPolicy {
  name = 'PatternCheck'

  // Example: Block aggressive formatting often used in spam
  private patterns = [
    { regex: /\b(buy|cheap|viagra|crypto)\b/i, label: 'Spam keywords detected.' },
    // Add more patterns here
  ]

  async check(text: string): Promise<ModerationResult> {
    for (const p of this.patterns) {
      if (p.regex.test(text)) {
        return {
          status: 'flagged', // Regex is often false-positive prone, so we might just flag
          reason: p.label,
          confidence: 0.8,
          policyName: this.name,
        }
      }
    }
    return { status: 'approved', confidence: 1.0, policyName: this.name }
  }
}

/**
 * 3. Semantic AI Policy
 * Uses Gemini to detect semantic toxicity across languages.
 */
export class SemanticPolicy implements ModerationPolicy {
  name = 'SemanticAICheck'
  private ai: GoogleGenAI

  constructor() {
    // Ideally this is cached/singleton at a higher level, but for encapsulation we init here.
    // Assuming API_KEY is available in env.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' })
  }

  async check(text: string): Promise<ModerationResult> {
    if (!process.env.API_KEY) {
      console.warn('Moderation: No API Key, skipping Semantic Check')
      return { status: 'approved', confidence: 0, policyName: this.name }
    }

    // Skip short texts to save tokens/latency
    if (text.trim().length < 4) {
      return { status: 'approved', confidence: 1, policyName: this.name }
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Classify the following text content for moderation. 
        Categories: TOXIC, SAFE. 
        Text: "${text.substring(0, 500)}"
        Response format: Just the category name.`,
        config: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      })

      const output = response.text?.trim().toUpperCase() || 'SAFE'

      if (output.includes('TOXIC')) {
        return {
          status: 'rejected',
          reason: 'Content classified as toxic or harmful by AI.',
          confidence: 0.9,
          policyName: this.name,
        }
      }

      return { status: 'approved', confidence: 0.9, policyName: this.name }
    } catch (e) {
      console.error('Moderation AI check failed', e)
      // Fail-open (approve) on AI error to not block user, but log it.
      return { status: 'approved', confidence: 0, policyName: this.name }
    }
  }
}
