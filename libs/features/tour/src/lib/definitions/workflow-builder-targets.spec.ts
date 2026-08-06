import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { WORKFLOW_TOURS } from './workflows'

import type { TourStep } from '../types'

/**
 * Drift guard for the `dashboard.workflow-builder` tour: every step `target`
 * must reference a `data-tour` anchor that is actually rendered somewhere in
 * the workflows feature lib. Anchors can appear either as a literal
 * `data-tour="..."` JSX attribute, or as a `dataTour="..."` prop passed into
 * a component that forwards it to `data-tour` (see WorkflowNodeDocsButton).
 */

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')
const WORKFLOWS_LIB_SRC = path.join(REPO_ROOT, 'libs/features/workflows/src')

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(full)
    if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) return [full]
    return []
  })
}

function collectRenderedAnchors(): Set<string> {
  const anchors = new Set<string>()
  const pattern = /data-tour="([^"]+)"|dataTour="([^"]+)"/g
  for (const file of collectFiles(WORKFLOWS_LIB_SRC)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) {
      const anchor = match[1] ?? match[2]
      if (anchor) anchors.add(anchor)
    }
  }
  return anchors
}

function extractTargetAnchor(target: string): string {
  const match = target.match(/data-tour="([^"]+)"/)
  if (!match) throw new Error(`Step target "${target}" does not use the [data-tour="..."] convention`)
  return match[1]
}

describe('workflow-builder tour targets', () => {
  const tour = WORKFLOW_TOURS.find((t) => t.id === 'dashboard.workflow-builder')

  it('has the dashboard.workflow-builder tour registered', () => {
    expect(tour).toBeDefined()
  })

  const renderedAnchors = collectRenderedAnchors()

  it('found at least one rendered data-tour anchor in the workflows lib (sanity check)', () => {
    expect(renderedAnchors.size).toBeGreaterThan(0)
  })

  const allSteps: TourStep[] = [
    ...(tour?.steps.desktop ?? []),
    ...(tour?.steps.tablet ?? []),
    ...(tour?.steps.mobile ?? []),
  ]
  const stepsWithTargets = allSteps.filter((step): step is TourStep & { target: string } =>
    Boolean(step.target),
  )

  it('has steps with targets to check (sanity check)', () => {
    expect(stepsWithTargets.length).toBeGreaterThan(0)
  })

  it.each(stepsWithTargets.map((step) => [step.target, step.titleKey] as const))(
    'target %s (step %s) matches a data-tour anchor actually rendered in the workflows lib',
    (target) => {
      const anchor = extractTargetAnchor(target)
      expect(
        renderedAnchors.has(anchor),
        `no rendered [data-tour="${anchor}"] found under libs/features/workflows/src`,
      ).toBe(true)
    },
  )
})
