/**
 * run-git.mjs — thin integration seam that spawns `git`. Intentionally not
 * unit-tested in detail (it needs a real repo); the parsing logic it feeds
 * (git-log.mjs) is the tested, pure part. Every function here degrades to a
 * safe empty result rather than throwing, so a generation failure never
 * takes down `vitepress build`.
 */
import { execFileSync } from 'node:child_process'

import { GIT_LOG_FORMAT, parseGitLogOutput } from './git-log.mjs'

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
}

/** Resolve the ref to treat as "main branch history" — prefers origin/main, falls back to main, then HEAD. */
export function resolveMainRef(cwd) {
  for (const ref of ['origin/main', 'main', 'HEAD']) {
    try {
      git(['rev-parse', '--verify', ref], cwd)
      return ref
    } catch {
      continue
    }
  }
  return 'HEAD'
}

/**
 * Commit history on `ref`, one entry per PR merge or direct commit to main.
 * Uses --first-parent so commits that only exist inside a merged feature
 * branch (i.e. already represented by that branch's single merge commit)
 * aren't also listed individually — matches "every PR or direct commit
 * merged into main", not "every commit ever reachable from main".
 * Returns [] (never throws) if git is unavailable or the repo is unusable.
 */
export function getMainCommits(cwd, ref = resolveMainRef(cwd)) {
  try {
    const raw = git(
      ['log', ref, '--first-parent', '--name-only', `--pretty=format:${GIT_LOG_FORMAT}`],
      cwd
    )
    return parseGitLogOutput(raw)
  } catch (err) {
    console.warn(`[tools/changelog] git log failed, generating with empty history: ${err.message}`)
    return []
  }
}

/** All tags, each with the set of commit SHAs reachable from it. Empty on any failure. */
export function getReleaseTags(cwd) {
  try {
    const tagList = git(['tag', '--list'], cwd)
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tagList.length === 0) return []
    return tagList.map((tag) => {
      try {
        const shas = git(['rev-list', tag], cwd)
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        return { tag, shas: new Set(shas) }
      } catch {
        return { tag, shas: new Set() }
      }
    })
  } catch (err) {
    console.warn(`[tools/changelog] git tag listing failed: ${err.message}`)
    return []
  }
}
