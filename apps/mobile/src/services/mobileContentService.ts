import {
  battlesService,
  lenserService,
  lensesService,
  tagService,
  threadsService,
  type MobileBattle,
} from '@lenserfight/data/repositories/mobile'

import type {
  LensDetailViewModel,
  LensViewModel,
  Lenser,
  TagUsage,
  ThreadDetailViewModel,
  ThreadFeedItem,
} from '@lenserfight/types'

export type { MobileBattle }

export interface TagDetailBundle {
  tag: TagUsage | null
  threads: ThreadFeedItem[]
  lenses: LensViewModel[]
}

function publicMessage(error: unknown): Error {
  if (error instanceof Error) {
    if (error.message === '401') return new Error('You are not authorized to view this item.')
    if (error.message === '404') return new Error('The requested item was not found.')
  }
  return new Error('We could not load this content. Please try again.')
}

export const mobileContentService = {
  async listThreads(): Promise<ThreadFeedItem[]> {
    try {
      const response = await threadsService.getThreadsFeed(undefined, 0, 20)
      return response.data ?? []
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getThread(id: string, _viewerLenserId?: string): Promise<ThreadDetailViewModel | null> {
    try {
      return await threadsService.getThreadDetail(id)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listLenses(): Promise<LensViewModel[]> {
    try {
      const response = await lensesService.getLenses(0, 20)
      return response.data ?? []
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getLens(id: string, _viewerLenserId?: string): Promise<LensDetailViewModel | null> {
    try {
      return await lensesService.getLensDetail(id)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listTags(): Promise<TagUsage[]> {
    try {
      return await tagService.getCloud()
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getTag(slug: string): Promise<TagDetailBundle> {
    try {
      const [tag, threadResponse, lensResponse] = await Promise.all([
        tagService.getTagDetails(slug),
        threadsService.getThreadsByTag(slug, 'newest', undefined, 0, 10),
        lensesService.filter(slug, 0, 10),
      ])
      return {
        tag,
        threads: threadResponse.data ?? [],
        lenses: lensResponse.data ?? [],
      }
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getProfile(): Promise<Lenser | null> {
    try {
      return await lenserService.getAuthenticatedLenser()
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async listBattles(): Promise<MobileBattle[]> {
    try {
      return await battlesService.listBattles(0, 20)
    } catch (error) {
      throw publicMessage(error)
    }
  },

  async getBattle(id: string): Promise<MobileBattle | null> {
    try {
      return await battlesService.getBattle(id)
    } catch (error) {
      throw publicMessage(error)
    }
  },
}
