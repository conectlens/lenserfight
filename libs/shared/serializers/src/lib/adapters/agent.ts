import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { YamlSerializer } from './YamlSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

export interface AgentExportPayload {
  id?: string
  ai_lenser_id?: string
  profile_id?: string
  handle?: string
  display_name?: string
  avatar_url?: string | null
  personality_note?: string | null
  runtime_pref?: string
  is_active?: boolean
  suspended_at?: string | null
  suspended_reason?: string | null
  can_join_battles?: boolean
  can_vote?: boolean
  can_create_battles?: boolean
  can_receive_sponsorship?: boolean
  model_binding_mode?: string
  max_daily_battles?: number
  max_daily_votes?: number
  allowed_battle_types?: string[]
  spending_limit_credits?: number
  is_public_policy?: boolean
  model_count?: number
  lens_count?: number
  battles_used?: number
  votes_used?: number
  credits_spent?: number
  owner_handle?: string
  owner_display_name?: string
  total_battles?: number
  battles_won?: number
  battles_lost?: number
  win_rate?: number | null
  created_at?: string
}

const AGENT_KIND: ExportKind = 'agent'

export class AgentJsonSerializer extends JsonSerializer<AgentExportPayload> {
  constructor() {
    super(AGENT_KIND)
  }
}

export class AgentYamlSerializer extends YamlSerializer<AgentExportPayload> {
  constructor() {
    super(AGENT_KIND)
  }
}

export class AgentMarkdownSerializer extends MarkdownSerializerBase<AgentExportPayload> {
  constructor() {
    super(AGENT_KIND)
  }

  title(envelope: ExportEnvelope<AgentExportPayload>): string {
    const { display_name, handle, id } = envelope.data
    return display_name || handle || id || 'AI Agent'
  }

  body(envelope: ExportEnvelope<AgentExportPayload>): string {
    const d = envelope.data
    const lines: string[] = []

    if (d.personality_note) {
      lines.push('## Personality')
      lines.push('')
      lines.push(stripHtml(escapeMarkdown(d.personality_note)))
      lines.push('')
    }

    lines.push('## Identity')
    lines.push('')
    lines.push('| Field | Value |')
    lines.push('| --- | --- |')
    if (d.handle) lines.push(`| Handle | \`@${escapeMarkdown(d.handle)}\` |`)
    if (d.id) lines.push(`| Agent ID | \`${d.id}\` |`)
    if (d.ai_lenser_id) lines.push(`| AI Lenser ID | \`${d.ai_lenser_id}\` |`)
    if (d.profile_id) lines.push(`| Profile ID | \`${d.profile_id}\` |`)
    if (d.runtime_pref) lines.push(`| Runtime | \`${d.runtime_pref}\` |`)
    if (d.model_binding_mode) lines.push(`| Model binding | \`${d.model_binding_mode}\` |`)
    if (typeof d.is_active === 'boolean') {
      lines.push(`| Status | ${d.is_active ? '`active`' : '`inactive`'} |`)
    }
    if (d.suspended_at) lines.push(`| Suspended at | \`${d.suspended_at}\` |`)
    if (d.created_at) lines.push(`| Created at | \`${d.created_at}\` |`)

    lines.push('')
    lines.push('## Capabilities')
    lines.push('')
    lines.push('| Capability | Allowed |')
    lines.push('| --- | --- |')
    if (typeof d.can_join_battles === 'boolean') {
      lines.push(`| Join battles | ${d.can_join_battles ? '`yes`' : '`no`'} |`)
    }
    if (typeof d.can_vote === 'boolean') {
      lines.push(`| Vote | ${d.can_vote ? '`yes`' : '`no`'} |`)
    }
    if (typeof d.can_create_battles === 'boolean') {
      lines.push(`| Create battles | ${d.can_create_battles ? '`yes`' : '`no`'} |`)
    }
    if (typeof d.can_receive_sponsorship === 'boolean') {
      lines.push(`| Sponsorship | ${d.can_receive_sponsorship ? '`yes`' : '`no`'} |`)
    }
    if (typeof d.is_public_policy === 'boolean') {
      lines.push(`| Public policy | ${d.is_public_policy ? '`yes`' : '`no`'} |`)
    }

    lines.push('')
    lines.push('## Quotas')
    lines.push('')
    lines.push('| Metric | Used | Limit |')
    lines.push('| --- | --- | --- |')
    if (typeof d.battles_used === 'number' || typeof d.max_daily_battles === 'number') {
      lines.push(`| Daily battles | \`${d.battles_used ?? 0}\` | \`${d.max_daily_battles ?? '∞'}\` |`)
    }
    if (typeof d.votes_used === 'number' || typeof d.max_daily_votes === 'number') {
      lines.push(`| Daily votes | \`${d.votes_used ?? 0}\` | \`${d.max_daily_votes ?? '∞'}\` |`)
    }
    if (typeof d.spending_limit_credits === 'number' || typeof d.credits_spent === 'number') {
      lines.push(`| Credits | \`${d.credits_spent ?? 0}\` | \`${d.spending_limit_credits ?? '∞'}\` |`)
    }

    if (
      typeof d.total_battles === 'number' ||
      typeof d.battles_won === 'number' ||
      typeof d.battles_lost === 'number' ||
      typeof d.win_rate === 'number'
    ) {
      lines.push('')
      lines.push('## Performance')
      lines.push('')
      lines.push('| Metric | Value |')
      lines.push('| --- | --- |')
      if (typeof d.total_battles === 'number') lines.push(`| Total battles | \`${d.total_battles}\` |`)
      if (typeof d.battles_won === 'number') lines.push(`| Wins | \`${d.battles_won}\` |`)
      if (typeof d.battles_lost === 'number') lines.push(`| Losses | \`${d.battles_lost}\` |`)
      if (typeof d.win_rate === 'number') lines.push(`| Win rate | \`${d.win_rate}\` |`)
    }

    if (d.owner_handle || d.owner_display_name) {
      lines.push('')
      lines.push('## Owner')
      lines.push('')
      const label = d.owner_display_name
        ? `${escapeMarkdown(d.owner_display_name)}${d.owner_handle ? ` (\`@${escapeMarkdown(d.owner_handle)}\`)` : ''}`
        : `\`@${escapeMarkdown(d.owner_handle ?? '')}\``
      lines.push(label)
    }

    if (d.allowed_battle_types && d.allowed_battle_types.length > 0) {
      const safe = d.allowed_battle_types.map((t) => escapeMarkdown(t)).map((t) => `\`${t}\``)
      lines.push('')
      lines.push(`**Allowed battle types:** ${safe.join(' ')}`)
    }

    return lines.join('\n')
  }
}
