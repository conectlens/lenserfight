import { callRpc, callRest } from '../utils/api';

export type LenserKind = 'human' | 'ai';
export type LenserListFilter = 'all' | LenserKind;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SHORT_ID_RE = /^[0-9a-f]{6,12}$/i;

export type LenserSearchRow = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url?: string | null;
  type: LenserKind | string;
};

/** Unified row for `lf lenser list` and `lf lenser find`. */
export type LenserCatalogRow = {
  profile_id: string;
  handle: string;
  display_name: string;
  type: LenserKind;
  /** agents.ai_lensers.id when type is ai */
  ai_lenser_id?: string;
  scope?: 'mine' | 'public';
  is_active?: boolean;
  created_at?: string;
  runtime_pref?: string | null;
};

export type AgentProfileJson = Record<string, unknown> & {
  id?: string;
  ai_lenser_id?: string;
  profile_id?: string;
  handle?: string;
  display_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  runtime_pref?: string | null;
  owner_handle?: string;
};

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

export function parseLenserTypeFilter(raw?: string): LenserListFilter {
  const v = (raw ?? 'all').trim().toLowerCase();
  if (v === 'ai' || v === 'human') return v;
  if (v === 'all' || v === '') return 'all';
  throw new Error(`Invalid --type "${raw}". Use ai, human, or all.`);
}

export function formatHandle(handle: string): string {
  const h = normalizeUsername(handle);
  return h ? `@${h}` : '—';
}

export function nextStepHint(row: LenserCatalogRow): string {
  if (row.type === 'ai') {
    return row.ai_lenser_id
      ? `lf lenser ai view ${formatHandle(row.handle)}`
      : `lf lenser ai list`;
  }
  return `lf lenser human follow ${formatHandle(row.handle)}`;
}

export function extractProfileId(profile: unknown): string | null {
  if (Array.isArray(profile)) return profile.length > 0 ? extractProfileId(profile[0]) : null;
  if (profile && typeof profile === 'object' && 'id' in profile) {
    const id = (profile as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

export async function resolveSelfProfileId(): Promise<string | null> {
  const self = await callRpc<unknown>('fn_lensers_get_active_profile', {}, { requireAuth: true });
  return extractProfileId(self);
}

async function searchLensers(query: string, limit: number): Promise<LenserSearchRow[]> {
  const rows = await callRpc<LenserSearchRow[]>(
    'fn_search_lensers',
    { p_query: query, p_limit: limit },
    { requireAuth: true },
  );
  return Array.isArray(rows) ? rows : [];
}

async function attachAiLenserIds(rows: LenserCatalogRow[]): Promise<LenserCatalogRow[]> {
  const aiProfiles = rows.filter((r) => r.type === 'ai');
  if (aiProfiles.length === 0) return rows;

  const profileIds = aiProfiles.map((r) => r.profile_id).join(',');
  const agents = await callRest<
    Array<{ id: string; profile_id: string }>
  >('agents', 'ai_lensers', 'GET', undefined, {
    requireAuth: true,
    query: { select: 'id,profile_id', profile_id: `in.(${profileIds})`, limit: aiProfiles.length },
  });
  const byProfile = new Map((agents ?? []).map((a) => [a.profile_id, a.id]));

  return rows.map((r) =>
    r.type === 'ai' ? { ...r, ai_lenser_id: byProfile.get(r.profile_id) } : r,
  );
}

function profileToCatalogRow(
  p: LenserSearchRow,
  extra: Partial<LenserCatalogRow> = {},
): LenserCatalogRow {
  return {
    profile_id: p.id,
    handle: p.handle,
    display_name: p.display_name ?? p.handle,
    type: p.type === 'ai' ? 'ai' : 'human',
    ...extra,
  };
}

/** Exact handle lookup (human or AI). */
export async function findLensersByHandle(identifier: string): Promise<LenserCatalogRow[]> {
  const normalized = normalizeUsername(identifier);
  if (!normalized) return [];

  const search = await searchLensers(`@${normalized}`, 12);
  const exact = search.filter((r) => normalizeUsername(r.handle) === normalized);
  const rows = exact.map((p) => profileToCatalogRow(p));
  return attachAiLenserIds(rows);
}

export async function listHumanLensers(limit = 50): Promise<LenserCatalogRow[]> {
  const search = await searchLensers('', limit);
  return search
    .filter((p) => p.type === 'human')
    .map((p) => profileToCatalogRow(p, { scope: 'public' }));
}

function mapAgentProfileToRow(row: AgentProfileJson, scope: 'mine' | 'public'): LenserCatalogRow {
  const profileId = String(row.profile_id ?? '');
  const aiId = String(row.id ?? row.ai_lenser_id ?? '');
  return {
    profile_id: profileId || aiId,
    ai_lenser_id: aiId,
    handle: String(row.handle ?? ''),
    display_name: String(row.display_name ?? row.handle ?? aiId),
    type: 'ai',
    scope,
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? ''),
    runtime_pref: (row.runtime_pref as string | null) ?? null,
  };
}

async function listOwnedAiLensers(ownerProfileId: string): Promise<LenserCatalogRow[]> {
  const rows = await callRpc<AgentProfileJson[]>(
    'fn_list_agents_by_owner',
    { p_owner_lenser_id: ownerProfileId },
    { requireAuth: true },
  );
  return (Array.isArray(rows) ? rows : []).map((r) => mapAgentProfileToRow(r, 'mine'));
}

async function listPublicAiLensers(limit = 50): Promise<LenserCatalogRow[]> {
  const search = await searchLensers('', limit);
  const aiProfiles = search.filter((p) => p.type === 'ai');
  if (aiProfiles.length === 0) return [];

  const profileIds = aiProfiles.map((p) => p.id).join(',');
  const agents = await callRest<
    Array<{
      id: string;
      profile_id: string;
      display_name: string | null;
      is_active: boolean;
      created_at: string;
      runtime_pref: string | null;
    }>
  >('agents', 'ai_lensers', 'GET', undefined, {
    requireAuth: true,
    query: {
      select: 'id,profile_id,display_name,is_active,created_at,runtime_pref',
      profile_id: `in.(${profileIds})`,
      limit,
    },
  });
  const agentByProfile = new Map((agents ?? []).map((a) => [a.profile_id, a]));

  const rows: LenserCatalogRow[] = [];
  for (const profile of aiProfiles) {
    const agent = agentByProfile.get(profile.id);
    if (!agent) continue;
    rows.push(
      mapAgentProfileToRow(
        {
          id: agent.id,
          profile_id: profile.id,
          handle: profile.handle,
          display_name: profile.display_name ?? agent.display_name,
          is_active: agent.is_active,
          created_at: agent.created_at,
          runtime_pref: agent.runtime_pref,
        },
        'public',
      ),
    );
  }
  return rows;
}

export async function listAiLensers(): Promise<LenserCatalogRow[]> {
  const selfId = await resolveSelfProfileId();
  const owned = selfId ? await listOwnedAiLensers(selfId) : [];
  const ownedIds = new Set(owned.map((a) => a.ai_lenser_id ?? a.profile_id));
  const publicRows = (await listPublicAiLensers()).filter(
    (a) => !ownedIds.has(a.ai_lenser_id ?? a.profile_id),
  );
  return [...owned, ...publicRows];
}

export async function listLensers(filter: LenserListFilter = 'all'): Promise<LenserCatalogRow[]> {
  if (filter === 'human') return listHumanLensers();
  if (filter === 'ai') return listAiLensers();
  const [human, ai] = await Promise.all([listHumanLensers(), listAiLensers()]);
  const seen = new Set<string>();
  const merged: LenserCatalogRow[] = [];
  for (const row of [...human, ...ai]) {
    const key = `${row.type}:${row.profile_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged.sort((a, b) => a.handle.localeCompare(b.handle));
}

export async function resolveAiLenserIdFromProfileId(profileId: string): Promise<string> {
  const agents = await callRest<Array<{ id: string }>>(
    'agents',
    'ai_lensers',
    'GET',
    undefined,
    {
      requireAuth: true,
      query: { select: 'id', profile_id: `eq.${profileId}`, limit: 1 },
    },
  );
  const agent = agents?.[0];
  if (!agent) throw new Error('Profile exists but has no AI lenser record.');
  return agent.id;
}

export async function resolveProfileId(identifier: string): Promise<string> {
  const raw = identifier.trim();
  if (UUID_RE.test(raw)) return raw;

  const found = await findLensersByHandle(raw);
  const human = found.filter((r) => r.type === 'human');
  if (human.length === 1) return human[0].profile_id;
  if (found.length === 1) return found[0].profile_id;
  if (found.length > 1) {
    throw new Error(
      `Identifier "${identifier}" is ambiguous. Run \`lf lenser find ${formatHandle(raw)}\`.`,
    );
  }
  throw new Error(
    `No lenser profile found for "${identifier}". Run \`lf lenser find @handle\`.`,
  );
}

export async function resolveAiLenserIdFromIdentifier(identifier: string): Promise<string> {
  const raw = identifier.trim();
  if (UUID_RE.test(raw)) {
    const rows = await callRest<Array<{ id: string }>>(
      'agents',
      'ai_lensers',
      'GET',
      undefined,
      { requireAuth: true, query: { select: 'id', id: `eq.${raw}`, limit: 1 } },
    );
    if (rows?.[0]) return rows[0].id;
    throw new Error(`No AI lenser found with id ${raw}. Run \`lf lenser ai list\`.`);
  }

  const normalized = normalizeUsername(raw);
  const lower = raw.toLowerCase();
  const all = await listAiLensers();
  const matches = all.filter((row) => {
    const handle = normalizeUsername(row.handle);
    return (
      (SHORT_ID_RE.test(raw) &&
        (row.ai_lenser_id?.toLowerCase().startsWith(lower) ?? false)) ||
      (handle.length > 0 && handle === normalized) ||
      row.display_name.toLowerCase() === lower
    );
  });

  if (matches.length === 1 && matches[0].ai_lenser_id) return matches[0].ai_lenser_id;
  if (matches.length > 1) {
    throw new Error(
      `Identifier "${identifier}" matches multiple AI lensers. Use \`lf lenser ai list\` or a full id.`,
    );
  }

  const found = await findLensersByHandle(raw);
  const ai = found.filter((r) => r.type === 'ai');
  if (ai.length === 1 && ai[0].ai_lenser_id) return ai[0].ai_lenser_id;
  if (found.some((r) => r.type === 'human')) {
    throw new Error(
      `${formatHandle(normalized)} is a human lenser. Use \`lf lenser find\` or human commands (e.g. \`lf lenser human follow\`).`,
    );
  }

  throw new Error(
    `No AI lenser found for "${identifier}". Run \`lf lenser find @handle\` or \`lf lenser ai list\`.`,
  );
}

export async function getAiLenserProfile(aiLenserId: string): Promise<AgentProfileJson | null> {
  const owned = await callRpc<AgentProfileJson | null>(
    'fn_get_agent_profile',
    { p_ai_lenser_id: aiLenserId },
    { requireAuth: true },
  );
  if (owned && typeof owned === 'object') return owned;

  const agents = await callRest<
    Array<{
      id: string;
      profile_id: string;
      display_name: string | null;
      is_active: boolean;
      created_at: string;
      runtime_pref: string | null;
    }>
  >('agents', 'ai_lensers', 'GET', undefined, {
    requireAuth: true,
    query: {
      select: 'id,profile_id,display_name,is_active,created_at,runtime_pref',
      id: `eq.${aiLenserId}`,
      limit: 1,
    },
  });
  const agent = agents?.[0];
  if (!agent) return null;

  const profiles = await callRest<
    Array<{ id: string; handle: string; display_name: string | null; type: string }>
  >('lensers', 'profiles', 'GET', undefined, {
    requireAuth: true,
    query: { select: 'id,handle,display_name,type', id: `eq.${agent.profile_id}`, limit: 1 },
  });
  const profile = profiles?.[0];
  if (!profile || profile.type !== 'ai') return null;

  return {
    id: agent.id,
    profile_id: agent.profile_id,
    handle: profile.handle,
    display_name: profile.display_name ?? agent.display_name,
    is_active: agent.is_active,
    created_at: agent.created_at,
    runtime_pref: agent.runtime_pref,
    lenser_type: profile.type,
  };
}
