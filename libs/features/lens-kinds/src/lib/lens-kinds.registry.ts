import type {
  ContractFieldSchema,
  LensInputContract,
  LensKind,
  LensOutputContract,
} from '@lenserfight/types'

/**
 * Static metadata for a single `LensKind`. The registry below is the
 * single source of truth for:
 *   - default input/output contracts when a new lens of this kind is created
 *   - suggested tools + modalities surfaced by the builder's kind picker
 *   - a prompt skeleton a contributor can tweak instead of starting from
 *     scratch
 *   - a `kind:*` tag slug used by `content.tag_map`
 *   - UI hints (badge colour, icon key, short description)
 *
 * Adding a new kind means:
 *   1. Extend `LensKind` in libs/types/src/lib/contracts.types.ts
 *   2. Register a new `LensKindDefinition` below
 *   3. Add a seed row + tag in supabase/seeds
 */
export interface LensKindDefinition {
  kind: LensKind
  tagSlug: `kind:${LensKind}`
  label: string
  description: string
  /** lucide-ish icon key; UI maps this to a real icon. */
  icon: string
  /** Tailwind-ish badge color key; UI maps this to a palette entry. */
  badgeColor: string
  /** Default input contract applied to new lens versions of this kind. */
  defaultInputContract: LensInputContract
  /** Default output contract applied to new lens versions of this kind. */
  defaultOutputContract: LensOutputContract
  /** Suggested tool categories to surface in the version parameter picker. */
  suggestedToolCategories: ('input' | 'media' | 'execution' | 'battle' | 'system')[]
  /** Preferred input modalities (`text`, `image`, `audio`, `video`). */
  suggestedInputModalities: ('text' | 'image' | 'audio' | 'video' | 'json')[]
  /** Preferred output modalities. */
  suggestedOutputModalities: ('text' | 'image' | 'audio' | 'video' | 'json' | 'pdf')[]
  /** Skeleton prompt new lenses start from. Keep placeholder-heavy. */
  promptSkeleton: string
}

const BRIEF_FIELD: ContractFieldSchema = {
  type: 'string',
  required: true,
  minLength: 8,
  description: 'Primary creative brief / topic the lens should address.',
}

const TEXT_OUTPUT_SCHEMA: Record<string, ContractFieldSchema> = {
  title: { type: 'string', required: true, minLength: 4 },
  sections: { type: 'array', itemType: 'json' },
  citations: { type: 'array', itemType: 'json' },
}

const IMAGE_OUTPUT_SCHEMA: Record<string, ContractFieldSchema> = {
  url: { type: 'url', required: true },
  width: { type: 'integer' },
  height: { type: 'integer' },
  seed: { type: 'integer' },
}

const VIDEO_OUTPUT_SCHEMA: Record<string, ContractFieldSchema> = {
  url: { type: 'url', required: true },
  duration_s: { type: 'number' },
  scenes: { type: 'array', itemType: 'json' },
}

const RESEARCH_OUTPUT_SCHEMA: Record<string, ContractFieldSchema> = {
  findings: { type: 'array', itemType: 'json', required: true },
  sources: { type: 'array', itemType: 'json' },
  confidence: { type: 'number', min: 0, max: 1 },
}

const PDF_OUTPUT_SCHEMA: Record<string, ContractFieldSchema> = {
  object_id: { type: 'string', required: true },
  page_count: { type: 'integer', min: 1 },
}

export const LENS_KIND_REGISTRY: Record<LensKind, LensKindDefinition> = {
  text: {
    kind: 'text',
    tagSlug: 'kind:text',
    label: 'Text',
    description: 'Long-form or structured text generation: articles, reports, posts, summaries.',
    icon: 'text',
    badgeColor: 'slate',
    defaultInputContract: {
      kind: 'text',
      fields: {
        brief: BRIEF_FIELD,
        tone: { type: 'string', description: 'e.g. neutral, playful, clinical.' },
        audience: { type: 'string', description: 'Target reader.' },
      },
    },
    defaultOutputContract: {
      kind: 'text',
      artifactKind: 'text',
      schema: TEXT_OUTPUT_SCHEMA,
      tokens: ['output'],
    },
    suggestedToolCategories: ['input'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['text'],
    promptSkeleton:
      'You are a writing specialist.\nBrief: [[brief]]\nAudience: [[audience]]\nTone: [[tone]]\n\nProduce a well-structured response with clear sections and a short title.',
  },
  image: {
    kind: 'image',
    tagSlug: 'kind:image',
    label: 'Image',
    description: 'Concept art, thumbnails, product visuals, branding assets.',
    icon: 'image',
    badgeColor: 'indigo',
    defaultInputContract: {
      kind: 'image',
      fields: {
        brief: BRIEF_FIELD,
        style: { type: 'string', description: 'e.g. cinematic, minimal, flat, 3D render.' },
        aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
        negative_prompt: { type: 'string' },
      },
    },
    defaultOutputContract: {
      kind: 'image',
      artifactKind: 'image',
      schema: IMAGE_OUTPUT_SCHEMA,
      tokens: ['url'],
    },
    suggestedToolCategories: ['input', 'media'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['image'],
    promptSkeleton:
      'Generate an image based on:\nSubject: [[brief]]\nStyle: [[style]]\nAspect ratio: [[aspect_ratio]]\nAvoid: [[negative_prompt]]',
  },
  video: {
    kind: 'video',
    tagSlug: 'kind:video',
    label: 'Video',
    description: 'Short-form videos, storyboards, scene sequences, cinematic prompts.',
    icon: 'video',
    badgeColor: 'rose',
    defaultInputContract: {
      kind: 'video',
      fields: {
        brief: BRIEF_FIELD,
        duration_s: { type: 'number', min: 1, max: 60 },
        aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16'] },
      },
    },
    defaultOutputContract: {
      kind: 'video',
      artifactKind: 'video',
      schema: VIDEO_OUTPUT_SCHEMA,
      tokens: ['url'],
    },
    suggestedToolCategories: ['input', 'media'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['video'],
    promptSkeleton:
      'Produce a short video described by:\nScene: [[brief]]\nDuration (s): [[duration_s]]\nAspect ratio: [[aspect_ratio]]',
  },
  research: {
    kind: 'research',
    tagSlug: 'kind:research',
    label: 'Research',
    description: 'Deep search + synthesis. Returns structured findings with sources.',
    icon: 'search',
    badgeColor: 'emerald',
    defaultInputContract: {
      kind: 'research',
      fields: {
        question: { type: 'string', required: true, minLength: 8 },
        scope: { type: 'string' },
        trust_criteria: { type: 'string' },
      },
    },
    defaultOutputContract: {
      kind: 'research',
      artifactKind: 'json',
      schema: RESEARCH_OUTPUT_SCHEMA,
      tokens: ['output', 'findings'],
    },
    suggestedToolCategories: ['input', 'execution'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['json', 'text'],
    promptSkeleton:
      'You are a research analyst.\nQuestion: [[question]]\nScope: [[scope]]\nTrust criteria: [[trust_criteria]]\n\nReturn findings as structured JSON with citations.',
  },
  pdf: {
    kind: 'pdf',
    tagSlug: 'kind:pdf',
    label: 'PDF',
    description: 'Export lens. Renders text/research into a PDF uploaded to media.objects.',
    icon: 'file-text',
    badgeColor: 'amber',
    defaultInputContract: {
      kind: 'pdf',
      fields: {
        title: { type: 'string', required: true, minLength: 4 },
        sections: { type: 'array', required: true, itemType: 'json' },
        theme: { type: 'string', enum: ['default', 'brand', 'minimal'] },
      },
    },
    defaultOutputContract: {
      kind: 'pdf',
      artifactKind: 'json',
      outputType: 'pdf',
      schema: PDF_OUTPUT_SCHEMA,
      tokens: ['object_id'],
    },
    suggestedToolCategories: ['input', 'media'],
    suggestedInputModalities: ['text', 'json'],
    suggestedOutputModalities: ['pdf'],
    promptSkeleton:
      'Render a PDF with:\nTitle: [[title]]\nSections: [[sections]]\nTheme: [[theme]]',
  },
  transform: {
    kind: 'transform',
    tagSlug: 'kind:transform',
    label: 'Transform',
    description: 'Reshape an envelope — text → prompt, research → slides, refine tone.',
    icon: 'shuffle',
    badgeColor: 'sky',
    defaultInputContract: {
      kind: 'transform',
      fields: {
        input: { type: 'any', required: true },
        instruction: { type: 'string', required: true },
      },
    },
    defaultOutputContract: {
      kind: 'transform',
      artifactKind: 'text',
      tokens: ['output'],
    },
    suggestedToolCategories: ['input'],
    suggestedInputModalities: ['text', 'json'],
    suggestedOutputModalities: ['text', 'json'],
    promptSkeleton:
      'Transform the input according to the instruction.\nInput:\n[[input]]\n\nInstruction:\n[[instruction]]',
  },
  orchestration: {
    kind: 'orchestration',
    tagSlug: 'kind:orchestration',
    label: 'Orchestration',
    description: 'Plans other lens calls, produces a JSON execution plan.',
    icon: 'network',
    badgeColor: 'violet',
    defaultInputContract: {
      kind: 'orchestration',
      fields: {
        intent: { type: 'string', required: true },
        constraints: { type: 'string' },
      },
    },
    defaultOutputContract: {
      kind: 'orchestration',
      artifactKind: 'json',
      schema: {
        steps: { type: 'array', required: true, itemType: 'json' },
      },
      tokens: ['output', 'steps'],
    },
    suggestedToolCategories: ['input', 'execution'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['json'],
    promptSkeleton:
      'You are a workflow planner.\nIntent: [[intent]]\nConstraints: [[constraints]]\n\nReturn a JSON array of steps with name, purpose, inputs, and execution type.',
  },
  validation: {
    kind: 'validation',
    tagSlug: 'kind:validation',
    label: 'Validation',
    description: 'Scores an output against criteria; returns pass/fail + report.',
    icon: 'check-circle',
    badgeColor: 'lime',
    defaultInputContract: {
      kind: 'validation',
      fields: {
        candidate: { type: 'any', required: true },
        criteria: { type: 'string', required: true },
      },
    },
    defaultOutputContract: {
      kind: 'validation',
      artifactKind: 'json',
      schema: {
        pass: { type: 'boolean', required: true },
        score: { type: 'number', min: 0, max: 1 },
        report: { type: 'string' },
      },
      tokens: ['output', 'pass', 'score'],
    },
    suggestedToolCategories: ['input'],
    suggestedInputModalities: ['text', 'json'],
    suggestedOutputModalities: ['json'],
    promptSkeleton:
      'You are a strict reviewer.\nCandidate:\n[[candidate]]\n\nCriteria:\n[[criteria]]\n\nReturn JSON with {pass, score (0-1), report}.',
  },
  routing: {
    kind: 'routing',
    tagSlug: 'kind:routing',
    label: 'Routing',
    description: 'Classifies user intent and selects a downstream branch.',
    icon: 'git-branch',
    badgeColor: 'orange',
    defaultInputContract: {
      kind: 'routing',
      fields: {
        message: { type: 'string', required: true },
        routes: { type: 'array', required: true, itemType: 'string' },
      },
    },
    defaultOutputContract: {
      kind: 'routing',
      artifactKind: 'json',
      schema: {
        route: { type: 'string', required: true },
        reason: { type: 'string' },
      },
      tokens: ['output', 'route'],
    },
    suggestedToolCategories: ['input'],
    suggestedInputModalities: ['text'],
    suggestedOutputModalities: ['json'],
    promptSkeleton:
      'You are a routing agent. Choose exactly one route for the message.\nMessage: [[message]]\nRoutes: [[routes]]\n\nReturn JSON {route, reason}.',
  },
}

/** Ordered list of all kinds — stable UI ordering. */
export const LENS_KIND_ORDER: LensKind[] = [
  'text',
  'image',
  'video',
  'research',
  'pdf',
  'transform',
  'orchestration',
  'validation',
  'routing',
]

export function getLensKind(kind: LensKind): LensKindDefinition {
  return LENS_KIND_REGISTRY[kind]
}

export function resolveLensKindFromTagSlugs(slugs: string[] | null | undefined): LensKind | null {
  if (!slugs?.length) return null
  for (const slug of slugs) {
    if (!slug.startsWith('kind:')) continue
    const kind = slug.slice('kind:'.length) as LensKind
    if (LENS_KIND_REGISTRY[kind]) return kind
  }
  return null
}

export function listLensKindDefinitions(): LensKindDefinition[] {
  return LENS_KIND_ORDER.map((k) => LENS_KIND_REGISTRY[k])
}
