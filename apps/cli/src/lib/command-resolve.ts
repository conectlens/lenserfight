/**
 * Canonical command-name resolver — the single place that normalizes a typed
 * command before it reaches citty's (case-sensitive) subcommand lookup.
 *
 * Used by both real entry points so they can never drift apart again:
 *  - main.ts, before `runMain(main, { rawArgs })`
 *  - tui/command-dispatch.ts's dispatchInProcess, before `runCommand(main, { rawArgs })`
 *
 * Root cause this fixes: citty's resolveSubCommand does a plain
 * `subCommands[name]` object lookup, so `AGENTS` never matches the lowercase
 * `agents` key. Nothing normalized the typed string before it reached that
 * lookup in either entry point.
 */

const REPL_PREFIX_TOKENS = new Set(['lf', 'lenserfight'])

export interface ResolveResult {
  argv: string[]
  /** True once at least one leading token was matched against the known command tree. */
  matched: boolean
  /** Typo-aware alternatives when the first non-flag token didn't match anything. */
  suggestions: string[]
}

/**
 * Cheap, synchronous, dependency-free normalization of only the top-level
 * command token: strips one optional leading `lf`/`lenserfight` token and one
 * leading `/`, then case-insensitively rewrites that token to its canonical
 * (known) casing. Every other token — flags, positional args, values — is
 * left byte-for-byte untouched. Safe to run on every process start.
 */
export function normalizeTopLevel(argv: readonly string[], knownKeys: readonly string[]): string[] {
  const out = [...argv]
  let i = firstNonFlagIndex(out, 0)
  if (i === -1) return out

  if (REPL_PREFIX_TOKENS.has(out[i].toLowerCase())) {
    out.splice(i, 1)
    i = firstNonFlagIndex(out, i)
    if (i === -1) return out
  }

  if (out[i].startsWith('/')) out[i] = out[i].slice(1)
  if (!out[i]) return out

  const known = canonicalCaseMap(knownKeys)
  const canonical = known.get(out[i].toLowerCase())
  if (canonical) out[i] = canonical
  return out
}

/**
 * REPL-only, async-friendly deeper resolution against the full command
 * inventory: normalizes as many leading path segments as match
 * case-insensitively (command name, then one or two subcommand levels), and
 * — when the top-level token doesn't match anything at all — returns
 * typo-aware "did you mean" suggestions instead of silently failing.
 */
export function resolveCommandPath(argv: readonly string[], inventoryPaths: readonly string[][]): ResolveResult {
  const topKeys = Array.from(new Set(inventoryPaths.map((p) => p[0]).filter(Boolean)))
  const out = normalizeTopLevel(argv, topKeys)

  const i = firstNonFlagIndex(out, 0)
  if (i === -1) return { argv: out, matched: true, suggestions: [] }

  let candidates = inventoryPaths
  let depth = 0
  let matchedAny = false

  while (true) {
    const idx = i + depth
    if (idx >= out.length || out[idx].startsWith('-')) break
    const atDepth = candidates.filter((p) => p.length > depth)
    const levelTokens = canonicalCaseMap(
      Array.from(new Set(atDepth.map((p) => p[depth]).filter((s): s is string => !!s))),
    )
    const canonical = levelTokens.get(out[idx].toLowerCase())
    if (!canonical) break
    out[idx] = canonical
    candidates = atDepth.filter((p) => p[depth] === canonical)
    matchedAny = true
    depth++
  }

  if (matchedAny) return { argv: out, matched: true, suggestions: [] }

  const firstToken = out[i]?.replace(/^\//, '')
  const suggestions = firstToken ? suggestSimilar(firstToken, topKeys) : []
  return { argv: out, matched: false, suggestions }
}

/** Typo-aware nearest-match suggestions, ranked by edit distance. */
export function suggestSimilar(input: string, candidates: readonly string[], max = 3): string[] {
  const lower = input.toLowerCase()
  const maxDistance = Math.max(2, Math.ceil(lower.length / 2))
  return candidates
    .map((c) => ({ c, d: levenshtein(lower, c.toLowerCase()) }))
    .filter(({ d }) => d <= maxDistance)
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
    .slice(0, max)
    .map(({ c }) => c)
}

/**
 * citty types `subCommands` as `Resolvable<SubCommandsDef>` (object | Promise |
 * thunk), but the root command tree in main.ts always defines it as a plain
 * object literal — the keys are known synchronously without invoking any of
 * the lazy per-command resolver functions. Runtime-checks down to that case.
 */
export function topLevelKeysOf(subCommands: unknown): string[] {
  if (subCommands && typeof subCommands === 'object' && !(subCommands instanceof Promise)) {
    return Object.keys(subCommands)
  }
  return []
}

function firstNonFlagIndex(argv: readonly string[], from: number): number {
  for (let idx = from; idx < argv.length; idx++) {
    if (!argv[idx].startsWith('-')) return idx
  }
  return -1
}

function canonicalCaseMap(keys: readonly string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const k of keys) map.set(k.toLowerCase(), k)
  return map
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}
