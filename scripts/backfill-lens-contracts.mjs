#!/usr/bin/env node

/**
 * Backfill `lenses.versions.input_contract` + `output_contract` for every
 * published or draft version that does not already have one.
 *
 * Inference rules (best-effort, idempotent):
 *   1. Look up the version's lens -> tag_map for any `kind:*` tag. If present,
 *      use that as the `LensKind`. Otherwise default to `text`.
 *   2. Pull version_parameters + tools to build the input contract's `fields`
 *      with `type` derived from the tool's type and `required` from the tool's
 *      own `required` flag.
 *   3. Output contract defaults to a permissive envelope for the inferred
 *      kind. No `schema` field is set — downstream validation stays loose
 *      until lens authors opt in.
 *
 * The script is a pure-JS, tsx-free CLI so contributors can run it without
 * extra tooling:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/backfill-lens-contracts.mjs [--dry-run]
 *
 * It relies on the service role key because `lenses.versions` updates are
 * guarded by RLS. Run it from the same environment as `supabase db reset` /
 * `supabase db push`, never against a public session.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const KNOWN_KINDS = new Set([
  'text',
  'image',
  'video',
  'research',
  'pdf',
  'transform',
  'orchestration',
  'validation',
  'routing',
])

const TOOL_TYPE_TO_CONTRACT_TYPE = {
  text: 'string',
  textarea: 'string',
  json: 'json',
  number: 'number',
  integer: 'integer',
  float: 'number',
  decimal: 'number',
  boolean: 'boolean',
  select: 'string',
  multiselect: 'array',
  url: 'url',
  date: 'string',
  datetime: 'string',
  file: 'string',
  execution_artifact_ids: 'array',
  media_attachment_ids: 'array',
  battle_ids: 'array',
}

const KIND_TO_ARTIFACT = {
  text: 'text',
  image: 'image',
  video: 'video',
  research: 'json',
  pdf: 'json',
  transform: 'text',
  orchestration: 'json',
  validation: 'json',
  routing: 'json',
}

async function inferKindForLens(lensId) {
  const { data: tagRows, error } = await supabase
    .schema('content')
    .from('tag_map')
    .select('tags:tag_id(slug)')
    .eq('entity_type', 'lens')
    .eq('entity_id', lensId)
  if (error) {
    console.warn(`tag_map lookup failed for lens ${lensId}:`, error.message)
    return 'text'
  }
  for (const row of tagRows ?? []) {
    const slug = row?.tags?.slug ?? ''
    if (slug.startsWith('kind:')) {
      const kind = slug.slice('kind:'.length)
      if (KNOWN_KINDS.has(kind)) return kind
    }
  }
  return 'text'
}

async function buildInputContract(versionId, kind) {
  const { data: params, error } = await supabase
    .schema('lenses')
    .from('version_parameters')
    .select('label, tool:tool_id(type, required)')
    .eq('version_id', versionId)
  if (error) {
    console.warn(`version_parameters lookup failed for version ${versionId}:`, error.message)
    return { kind, fields: {} }
  }

  const fields = {}
  for (const p of params ?? []) {
    const label = p?.label
    if (!label) continue
    const toolType = p?.tool?.type ?? 'text'
    fields[label] = {
      type: TOOL_TYPE_TO_CONTRACT_TYPE[toolType] ?? 'string',
      required: Boolean(p?.tool?.required),
    }
  }
  return { kind, fields }
}

function buildOutputContract(kind) {
  const artifactKind = KIND_TO_ARTIFACT[kind] ?? 'text'
  const contract = { kind, artifactKind, tokens: ['output'] }
  if (kind === 'pdf') contract.outputType = 'pdf'
  return contract
}

async function main() {
  console.log(`Backfilling lens version contracts${DRY_RUN ? ' (dry run)' : ''}...`)

  const { data: versions, error } = await supabase
    .schema('lenses')
    .from('versions')
    .select('id, lens_id, input_contract, output_contract, status')
    .is('input_contract', null)
  if (error) throw error

  console.log(`Found ${versions.length} version(s) without input_contract.`)

  let ok = 0
  let skip = 0
  for (const v of versions ?? []) {
    const kind = await inferKindForLens(v.lens_id)
    const input = await buildInputContract(v.id, kind)
    const output = v.output_contract ?? buildOutputContract(kind)

    if (DRY_RUN) {
      console.log(`[dry-run] ${v.id} -> kind=${kind} fields=${Object.keys(input.fields).length}`)
      ok++
      continue
    }

    const { error: updateErr } = await supabase
      .schema('lenses')
      .from('versions')
      .update({ input_contract: input, output_contract: output })
      .eq('id', v.id)

    if (updateErr) {
      console.error(`Failed to update ${v.id}:`, updateErr.message)
      skip++
    } else {
      ok++
    }
  }

  console.log(`Done. updated=${ok} failed=${skip}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
