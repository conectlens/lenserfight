import { defineTour } from './helpers'

import type { StepSpec } from './helpers'
import type { TourDefinition } from '../types'

/**
 * One tour per agent-workspace section (`/lenser/:handle/ag/<section>`).
 *
 * Step shapes are uniform: a centered intro card, then a step anchored to the
 * shared section header (`agent.section-header`, rendered by SectionPage for
 * every section). Section-specific copy lives in the locale files under
 * `tour.pages.agent.<section>` — only step structure is defined here.
 *
 * Public viewers only see the overview/runs/workflows sections; copy for the
 * owner-only sections (approvals, byok, cost, ...) is addressed to the owner.
 */
const SECTION_HEADER_STEP: StepSpec = {
  target: '[data-tour="agent.section-header"]',
  placement: 'bottom',
}

interface AgentSectionTour {
  section: string
  desktop: StepSpec[]
  mobile?: StepSpec[]
}

const AGENT_SECTION_TOURS: AgentSectionTour[] = [
  {
    section: 'overview',
    desktop: [{}, SECTION_HEADER_STEP, {}],
    // Desktop step 1 leans on the section header anchor — reworded as cards on mobile.
    mobile: [{}, {}, {}],
  },
  { section: 'runs', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'logs', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'reports', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'analytics', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'battles', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'scratchpad', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'team', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'workflows', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'schedules', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'evaluations', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'memory', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'instructions', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'personality', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'tools', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'models', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'providers', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'byok', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'approvals', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'cost', desktop: [{}, SECTION_HEADER_STEP] },
  { section: 'settings', desktop: [{}, SECTION_HEADER_STEP] },
]

export const AGENT_TOURS: TourDefinition[] = AGENT_SECTION_TOURS.map(({ section, desktop, mobile }) =>
  defineTour(`agent.${section}`, [`/lenser/:handle/ag/${section}`], desktop, { mobile }),
)
