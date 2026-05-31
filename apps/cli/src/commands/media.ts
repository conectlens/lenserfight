import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'
import { resolveConfig as resolveBaseConfig } from '../config/project-config'

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
  duration_seconds: number | null
  video_width: number | null
  video_height: number | null
  audio_sample_rate: number | null
  audio_channels: number | null
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
      if (args.run) {
        // TODO: replace with fn_get_execution_run once added to schema.sql.
        // execution.runs is not yet exposed via a public RPC; --run filter is unavailable on cloud.
        consola.warn('--run filter requires a public RPC not yet available. Showing all media.')
      }

      const rows = await callRpc<MediaObjectRow[]>(
        'fn_list_media_objects',
        { p_limit: limit },
        { requireAuth: true }
      )

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
        ])
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
      const rows = await callRpc<MediaObjectRow[]>(
        'fn_get_media_object',
        { p_object_id: args.id },
        { requireAuth: true }
      )
      if (!rows || rows.length === 0) {
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

      // Internal bucket path: request a signed URL from Supabase storage, then
      // download. The storage sign endpoint enforces RLS via the bearer token.
      const config = resolveBaseConfig()
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('Supabase URL/anon key not configured. Run `lf init`.')
      }
      const bucket = obj.bucket || 'generated-media'
      const signUrl = `${config.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${obj.object_key}`
      const signHeaders: Record<string, string> = {
        apikey: config.supabaseAnonKey,
        'Content-Type': 'application/json',
      }
      if (config.authToken) signHeaders['Authorization'] = `Bearer ${config.authToken}`

      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers: signHeaders,
        body: JSON.stringify({ expiresIn: 3600 }),
      })
      if (!signRes.ok) {
        throw new Error(`Storage sign request failed: ${signRes.status} ${signRes.statusText}`)
      }
      const { signedURL } = await signRes.json() as { signedURL: string }
      if (!signedURL) {
        throw new Error('Supabase storage did not return a signed URL.')
      }

      const proxied = await fetch(signedURL)
      if (!proxied.ok) {
        throw new Error(`Signed URL download failed: ${proxied.status} ${proxied.statusText}`)
      }
      const proxiedBytes = Buffer.from(await proxied.arrayBuffer())
      if (args.out) {
        writeFileSync(args.out, proxiedBytes)
        consola.success(`Wrote ${proxiedBytes.length} bytes to ${args.out}`)
      } else {
        process.stdout.write(proxiedBytes)
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media info (AO) ─────────────────────────────────────────────────────

const mediaInfo = defineCommand({
  meta: {
    name: 'info',
    description: 'Show metadata for a media object (MIME, size, duration, dimensions).',
  },
  args: {
    id: { type: 'string', description: 'media.objects.id', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<MediaObjectRow[]>(
        'fn_get_media_object',
        { p_object_id: args.id },
        { requireAuth: true }
      )
      if (!rows || rows.length === 0) {
        throw new Error(`Media object ${args.id} not found (or RLS denied access).`)
      }
      const obj = rows[0]
      if (args.json) {
        printJson(obj)
        return
      }
      printTable(
        ['Field', 'Value'],
        [
          ['ID', obj.id],
          ['MIME type', obj.mime_type ?? '—'],
          ['Media type', obj.media_type ?? '—'],
          ['Size (bytes)', obj.byte_size != null ? String(obj.byte_size) : '—'],
          ['Duration (s)', obj.duration_seconds != null ? String(obj.duration_seconds) : '—'],
          ['Width', obj.video_width != null ? String(obj.video_width) : '—'],
          ['Height', obj.video_height != null ? String(obj.video_height) : '—'],
          ['Sample rate', obj.audio_sample_rate != null ? String(obj.audio_sample_rate) : '—'],
          ['Channels', obj.audio_channels != null ? String(obj.audio_channels) : '—'],
          ['Visibility', obj.visibility ?? '—'],
          ['Lifecycle', obj.lifecycle_state ?? '—'],
          ['Created', obj.created_at.slice(0, 19).replace('T', ' ')],
        ]
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media play (AN) ─────────────────────────────────────────────────────

const mediaPlay = defineCommand({
  meta: {
    name: 'play',
    description: 'Open a media object in the system default browser/player.',
  },
  args: {
    id: { type: 'string', description: 'media.objects.id', required: true },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<MediaObjectRow[]>(
        'fn_get_media_object',
        { p_object_id: args.id },
        { requireAuth: true }
      )
      if (!rows || rows.length === 0) {
        throw new Error(`Media object ${args.id} not found (or RLS denied access).`)
      }
      const obj = rows[0]

      let url: string
      if (obj.external_url) {
        url = obj.external_url
      } else {
        const config = resolveBaseConfig()
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
          throw new Error('Supabase URL/anon key not configured. Run `lf init`.')
        }
        const bucket = obj.bucket || 'generated-media'
        const signUrl = `${config.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${obj.object_key}`
        const signHeaders: Record<string, string> = {
          apikey: config.supabaseAnonKey,
          'Content-Type': 'application/json',
        }
        if (config.authToken) signHeaders['Authorization'] = `Bearer ${config.authToken}`
        const signRes = await fetch(signUrl, {
          method: 'POST',
          headers: signHeaders,
          body: JSON.stringify({ expiresIn: 3600 }),
        })
        if (!signRes.ok) {
          throw new Error(`Storage sign request failed: ${signRes.status} ${signRes.statusText}`)
        }
        const { signedURL } = await signRes.json() as { signedURL: string }
        if (!signedURL) {
          throw new Error('Supabase storage did not return a signed URL.')
        }
        url = signedURL
      }

      const opener =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start ""'
            : 'xdg-open'
      execSync(`${opener} "${url}"`)
      consola.success(`Opened: ${url}`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media delete ────────────────────────────────────────────────────────

const mediaDelete = defineCommand({
  meta: {
    name: 'delete',
    description: 'Soft-delete a media object (sets lifecycle_state=deleted).',
  },
  args: {
    id: { type: 'string', description: 'media.objects.id', required: true },
    force: { type: 'boolean', description: 'Skip confirmation', default: false },
  },
  async run({ args }) {
    try {
      if (!args.force) {
        consola.warn(`This will soft-delete media object ${args.id}. Pass --force to confirm.`)
        process.exitCode = 1
        return
      }
      await callRpc<void>('fn_delete_media_object', { p_object_id: args.id }, { requireAuth: true })
      consola.success(`Deleted media object ${args.id}.`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media set-visibility ────────────────────────────────────────────────

const mediaSetVisibility = defineCommand({
  meta: {
    name: 'set-visibility',
    description: 'Set visibility of a media object (public | private | unlisted).',
  },
  args: {
    id: { type: 'string', description: 'media.objects.id', required: true },
    visibility: { type: 'string', description: 'public | private | unlisted', required: true },
  },
  async run({ args }) {
    try {
      if (!['public', 'private', 'unlisted'].includes(args.visibility)) {
        throw new Error(
          `Invalid visibility: ${args.visibility}. Must be public, private, or unlisted.`
        )
      }
      await callRpc<void>(
        'fn_toggle_media_visibility',
        { p_object_id: args.id, p_visibility: args.visibility },
        { requireAuth: true }
      )
      consola.success(`Set visibility to "${args.visibility}" for media object ${args.id}.`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media cleanup ───────────────────────────────────────────────────────

const mediaCleanup = defineCommand({
  meta: {
    name: 'cleanup',
    description: 'Find and optionally delete orphaned pending media uploads before a date.',
  },
  args: {
    before: {
      type: 'string',
      description: 'ISO 8601 date — find uploads created before this date',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print matched objects without deleting',
      default: true,
    },
  },
  async run({ args }) {
    try {
      const allRows = await callRpc<MediaObjectRow[]>(
        'fn_list_media_objects',
        { p_limit: 100 },
        { requireAuth: true }
      )
      const beforeDate = new Date(args.before)
      const rows = (allRows ?? []).filter(
        (r) => r.lifecycle_state === 'pending' && new Date(r.created_at) < beforeDate
      )

      if (rows.length === 0) {
        consola.info('No orphaned pending uploads found.')
        return
      }

      consola.info(`Found ${rows.length} pending upload(s) before ${args.before}.`)

      if (args['dry-run']) {
        printTable(
          ['id', 'media_type', 'mime_type', 'created_at'],
          rows.map((r) => [r.id, r.media_type ?? '—', r.mime_type ?? '—', r.created_at])
        )
        consola.warn('Dry-run mode. Pass --no-dry-run to delete.')
        return
      }

      let deleted = 0
      for (const row of rows) {
        await callRpc<void>(
          'fn_delete_media_object',
          { p_object_id: row.id },
          { requireAuth: true }
        )
        deleted++
      }
      consola.success(`Deleted ${deleted} orphaned media object(s).`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf media manifest ──────────────────────────────────────────────────────

const mediaManifest = defineCommand({
  meta: {
    name: 'manifest',
    description: 'Show the media manifest for a workflow run.',
  },
  args: {
    run: { type: 'string', description: 'lenses.workflow_runs.id', required: true },
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<{ media_manifest: unknown }>>(
        'fn_get_workflow_run_media_manifest',
        { p_run_id: args.run },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        throw new Error(`Workflow run ${args.run} not found (or RLS denied access).`)
      }

      const manifest = rows[0].media_manifest as Array<{
        object_id: string
        media_type: string
        mime_type: string
        node_id?: string
        added_at: string
      }>

      if (!Array.isArray(manifest) || manifest.length === 0) {
        consola.info("No media in this run's manifest.")
        return
      }

      if (args.json) {
        printJson(manifest)
        return
      }

      printTable(
        ['object_id', 'media_type', 'mime_type', 'node_id', 'added_at'],
        manifest.map((row) => [
          row.object_id,
          row.media_type,
          row.mime_type,
          row.node_id ?? '—',
          new Date(row.added_at).toLocaleString(),
        ])
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
    play: mediaPlay,
    info: mediaInfo,
    manifest: mediaManifest,
    delete: mediaDelete,
    'set-visibility': mediaSetVisibility,
    cleanup: mediaCleanup,
  },
})

export default mediaCommand
export { mediaCommand }
