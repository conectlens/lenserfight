import { writeFileSync } from 'node:fs'
import { defineCommand } from 'citty'
import consola from 'consola'
import { callRest, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

// Phase AK — `lf media` surface
//
// Read-only commands for inspecting and downloading media artifacts produced
// by workflow runs. Write paths (delete, set-visibility) land in Phase AT.
//
// All queries go through PostgREST against the `media` schema, so RLS
// enforces ownership — the user only sees their own media objects.

interface MediaObjectRow {
  id: string
  bucket: string
  object_key: string
  external_url: string | null
  mime_type: string | null
  media_type: string | null
  byte_size: number | null
  visibility: string | null
  lifecycle_state: string | null
  created_at: string
  request_id: string | null
}

// ─── lf media list ──────────────────────────────────────────────────────────

const mediaList = defineCommand({
  meta: {
    name: 'list',
    description: 'List media objects produced by workflow runs you own.',
  },
  args: {
    run: {
      type: 'string',
      description: 'Filter by execution.runs.id (joins via media.objects.request_id).',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Max rows to return (default 25, max 200).',
      default: '25',
    },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const limit = Math.max(1, Math.min(200, Number.parseInt(args.limit, 10) || 25))
      const query: Record<string, string | number> = {
        select:
          'id,bucket,object_key,external_url,mime_type,media_type,byte_size,visibility,lifecycle_state,created_at,request_id',
        order: 'created_at.desc',
        limit,
      }
      if (args.run) {
        // The run_id → request_id mapping is enforced at the worker; we filter
        // by request_id after the worker writes it to media.objects.
        const runs = await callRest<Array<{ request_id: string }>>(
          'execution',
          'runs',
          'GET',
          undefined,
          {
            query: { select: 'request_id', id: `eq.${args.run}`, limit: 1 },
            requireAuth: true,
          },
        )
        if (runs.length === 0) {
          consola.warn(`No run found for id ${args.run} (or RLS denied access).`)
          return
        }
        query['request_id'] = `eq.${runs[0].request_id}`
      }

      const rows = await callRest<MediaObjectRow[]>('media', 'objects', 'GET', undefined, {
        query,
        requireAuth: true,
      })

      if (args.json) {
        printJson(rows)
        return
      }

      if (rows.length === 0) {
        consola.info('No media objects found.')
        return
      }

      printTable(
        ['ID', 'Type', 'MIME', 'Bytes', 'Visibility', 'Created'],
        rows.map((r) => [
          r.id.slice(0, 8),
          r.media_type ?? '—',
          r.mime_type ?? '—',
          r.byte_size != null ? String(r.byte_size) : '—',
          r.visibility ?? '—',
          r.created_at.slice(0, 19).replace('T', ' '),
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media download ──────────────────────────────────────────────────────

const mediaDownload = defineCommand({
  meta: {
    name: 'download',
    description: 'Download a media object by id to a local file (or stdout when --out is omitted).',
  },
  args: {
    id: { type: 'string', description: 'media.objects.id', required: true },
    out: {
      type: 'string',
      description: 'Local path to write to. Omit to print bytes to stdout.',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const rows = await callRest<MediaObjectRow[]>('media', 'objects', 'GET', undefined, {
        query: {
          select: 'id,bucket,object_key,external_url,mime_type',
          id: `eq.${args.id}`,
          limit: 1,
        },
        requireAuth: true,
      })
      if (rows.length === 0) {
        throw new Error(`Media object ${args.id} not found (or RLS denied access).`)
      }
      const obj = rows[0]

      // External URL path (async providers store the provider URL directly).
      if (obj.external_url) {
        const res = await fetch(obj.external_url)
        if (!res.ok) {
          throw new Error(`Provider download failed: ${res.status} ${res.statusText}`)
        }
        const bytes = Buffer.from(await res.arrayBuffer())
        if (args.out) {
          writeFileSync(args.out, bytes)
          consola.success(`Wrote ${bytes.length} bytes to ${args.out}`)
        } else {
          process.stdout.write(bytes)
        }
        return
      }

      // Internal bucket path: signed URL via storage REST.
      // Phase AK only exposes `lf media download`; the media-proxy HTTP route
      // (signed-URL redirect with bearer auth) lands alongside the platform-api
      // worker work — until then we resolve the signed URL via the storage API
      // directly, which honors the same RLS check on media.objects.
      throw new Error(
        `Media object ${args.id} is stored internally (bucket=${obj.bucket}). ` +
          `Phase AK media-proxy is not yet wired in this CLI; download via the web UI for now.`,
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ─────────────────────────────────────────────────────────────────

const mediaCommand = defineCommand({
  meta: {
    name: 'media',
    description: 'Inspect and download media artifacts from workflow runs.',
  },
  subCommands: {
    list: mediaList,
    download: mediaDownload,
  },
})

export default mediaCommand
export { mediaCommand }
