import type {
  CreateLensDTO,
  CreateLensVersionDTO,
  ForkNode,
  LensRecord,
  LensVersion,
  LensViewModel,
  PersonalLensFeedItem,
  TagRecord,
  ToolRecord,
} from '@lenserfight/types'
import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { paginatedResponse } from '@lenserfight/api/contracts'
import { FileDataStore } from '@lenserfight/infra/storage'
import { generateUUID } from '@lenserfight/utils/text'
import type { LensesRepositoryPort } from '../lensesRepository'

const FILE_MODE_LENSER_ID = 'file-lenser-00000000-0000-0000-0000-000000000001'

const lensStore = new FileDataStore<LensRecord>('lenses')
const versionStore = new FileDataStore<LensVersion>('lenses_versions')

function buildLensRecord(input: CreateLensDTO, id: string): LensRecord {
  const now = new Date().toISOString()
  return {
    id,
    lenser_id: FILE_MODE_LENSER_ID,
    author_profile: {
      id: FILE_MODE_LENSER_ID,
      handle: 'dev',
      display_name: 'Local Dev',
    },
    title: input.title,
    description: input.description ?? null,
    content: input.content,
    visibility: (input.visibility as LensRecord['visibility']) ?? 'public',
    status: 'published',
    reaction_totals: {},
    tags: [],
    params: null,
    parent_lens_id: null,
    forked_from_execution_id: null,
    created_at: now,
    updated_at: now,
  }
}

export class FileLensesRepository implements LensesRepositoryPort {
  async getAll(offset = 0, limit = 20): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const all = await lensStore.findAll()
    const sorted = all.sort((a, b) => b.created_at.localeCompare(a.created_at))
    const items = sorted.slice(offset, offset + limit)
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: sorted.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async search(query: string, offset = 0, limit = 20, _ownerId?: string | null): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const q = query.toLowerCase()
    const all = await lensStore.findAll()
    const matched = all.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q)
    )
    const items = matched.slice(offset, offset + limit)
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: matched.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async filterByTag(
    _tagSlug: string | null,
    _sort?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensRecord[]>> {
    return this.getAll(offset, limit)
  }

  async sort(
    order: 'newest' | 'popular',
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensRecord[]>> {
    const start = Date.now()
    const all = await lensStore.findAll()
    const sorted =
      order === 'newest'
        ? all.sort((a, b) => b.created_at.localeCompare(a.created_at))
        : all.sort((a, b) => {
            const aTotal = Object.values((a.reaction_totals as Record<string, number>) ?? {}).reduce((s, v) => s + v, 0)
            const bTotal = Object.values((b.reaction_totals as Record<string, number>) ?? {}).reduce((s, v) => s + v, 0)
            return bTotal - aTotal
          })
    const items = sorted.slice(offset, offset + limit)
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: sorted.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async getTopLenses(limit: number): Promise<LensRecord[]> {
    const all = await lensStore.findAll()
    return all.slice(0, limit)
  }

  async getTrendingLenses(
    _lang?: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> {
    const start = Date.now()
    const all = await lensStore.findAll()
    const items = all.slice(offset, offset + limit) as unknown as LensViewModel[]
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: all.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async getPersonalFeed(offset = 0, limit = 20): Promise<ApiResponseEnvelope<PersonalLensFeedItem[]>> {
    const start = Date.now()
    const all = await lensStore.findAll()
    const items = all.slice(offset, offset + limit) as unknown as PersonalLensFeedItem[]
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: all.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async getFollowingFeed(
    _lenserId: string,
    offset = 0,
    limit = 20
  ): Promise<ApiResponseEnvelope<LensViewModel[]>> {
    return this.getTrendingLenses(undefined, offset, limit)
  }

  async getByLenser(handle: string, offset = 0, limit = 20): Promise<LensRecord[]> {
    const all = await lensStore.findAll()
    return all.slice(offset, offset + limit)
  }

  async getById(id: string): Promise<LensRecord | null> {
    return (await lensStore.findById(id)) ?? null
  }

  async getTags(_templateId: string): Promise<TagRecord[]> {
    return []
  }

  async createLens(input: CreateLensDTO): Promise<LensRecord> {
    const id = generateUUID()
    const record = buildLensRecord(input, id)
    await lensStore.save(record)
    return record
  }

  async updateLens(id: string, input: Partial<CreateLensDTO>): Promise<LensRecord> {
    const existing = await lensStore.findById(id)
    if (!existing) throw new Error(`Lens not found: ${id}`)
    const updated: LensRecord = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as LensRecord
    await lensStore.save(updated)
    return updated
  }

  async deleteLens(id: string): Promise<void> {
    await lensStore.remove(id)
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  async getVersions(lensId: string): Promise<LensVersion[]> {
    return versionStore.findWhere((v) => v.lensId === lensId)
  }

  async getVersionsPaginated(lensId: string, limit: number, offset: number): Promise<LensVersion[]> {
    const all = await this.getVersions(lensId)
    return all.slice(offset, offset + limit)
  }

  async getVersionById(versionId: string): Promise<LensVersion | null> {
    return (await versionStore.findById(versionId)) ?? null
  }

  async getLatestVersionId(lensId: string): Promise<string | null> {
    const versions = await this.getVersions(lensId)
    const sorted = versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return sorted[0]?.id ?? null
  }

  async getLatestPublishedVersion(lensId: string): Promise<LensVersion | null> {
    const versions = await this.getVersions(lensId)
    const published = versions.filter((v) => v.status === 'published')
    const sorted = published.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return sorted[0] ?? null
  }

  async createVersion(input: CreateLensVersionDTO): Promise<LensVersion> {
    const existing = await this.getVersions(input.lensId)
    const version: LensVersion = {
      id: generateUUID(),
      lensId: input.lensId,
      versionNumber: existing.length + 1,
      templateBody: input.templateBody,
      status: 'draft',
      changelog: input.changelog ?? null,
      parentVersionId: input.parentVersionId ?? null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
    }
    await versionStore.save(version)
    return version
  }

  async publishVersion(versionId: string): Promise<void> {
    const version = await versionStore.findById(versionId)
    if (!version) return
    await versionStore.save({
      ...version,
      status: 'published' as const,
      publishedAt: new Date().toISOString(),
    })
  }

  async cloneLens(sourceLensId: string, _versionId?: string | null): Promise<string> {
    const source = await lensStore.findById(sourceLensId)
    if (!source) throw new Error(`Source lens not found: ${sourceLensId}`)
    const cloned: LensRecord = {
      ...source,
      id: generateUUID(),
      parent_lens_id: sourceLensId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await lensStore.save(cloned)
    return cloned.id
  }

  async getForkTree(_lensId: string, _limit?: number): Promise<ForkNode[]> {
    return []
  }

  async getTools(_category?: string): Promise<ToolRecord[]> {
    return []
  }

  async getMyLenses(offset = 0, limit = 20): Promise<ApiResponseEnvelope<LensRecord[]>> {
    return this.getAll(offset, limit)
  }

  async getLatestVersion(lensId: string): Promise<LensVersion | null> {
    const versions = await this.getVersions(lensId)
    const sorted = versions.sort((a, b) => b.versionNumber - a.versionNumber)
    return sorted[0] ?? null
  }

  async updateVersionParams(_versionId: string, _params: Array<{ label: string; toolId: string }>): Promise<void> {
    // No-op in file mode — version params are not persisted separately.
  }
}
