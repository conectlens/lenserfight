/**
 * CLI data facade — unified personal content feeds (threads / lenses).
 * Matches forum feed RPCs in `threadsRepository` and `lensesRepository`.
 */
import type { PersonalFeedItem } from '@lenserfight/types'
import { getPersonalFeed as getPersonalLensFeed, type PersonalLensFeedRow } from './lenses'
import { getPersonalFeed as getPersonalThreadFeed } from './threads'

export type ContentFeedType = 'threads' | 'prompts' | 'lenses'

export type ContentFeedRow = {
  id: string
  title: string
  personal_score?: number
  primary_language?: string
}

const VALID_TYPES: ContentFeedType[] = ['threads', 'prompts', 'lenses']

export function isContentFeedType(value: string): value is ContentFeedType {
  return (VALID_TYPES as string[]).includes(value)
}

function lensRowToFeedRow(row: PersonalLensFeedRow): ContentFeedRow {
  return {
    id: row.id,
    title: row.title,
    personal_score: row.personal_score,
    primary_language: row.primary_language,
  }
}

function threadRowToFeedRow(row: PersonalFeedItem): ContentFeedRow {
  return {
    id: row.id,
    title: row.title,
    personal_score: row.personalScore,
    primary_language: row.primaryLanguage,
  }
}

/** Resolve personal feed rows for CLI display. `prompts` maps to lenses (no prompts RPC exists). */
export async function getPersonalContentFeed(
  type: ContentFeedType,
  limit: number,
  offset = 0,
): Promise<ContentFeedRow[]> {
  if (type === 'threads') {
    const rows = await getPersonalThreadFeed(offset, limit)
    return rows.map(threadRowToFeedRow)
  }
  const rows = await getPersonalLensFeed(offset, limit)
  return rows.map(lensRowToFeedRow)
}
