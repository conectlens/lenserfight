import type { BattleLayoutStrategy } from '../../../types/battle-layout.types'
import type { BattleContentType } from '../../../types/battle-renderer.types'
import type { Battle, BattleType } from '../../../types/battle.types'
import { AudioBattleLayout } from './AudioBattleLayout'
import { GenericBattleLayout } from './GenericBattleLayout'
import { ImageBattleLayout } from './ImageBattleLayout'
import { TextBattleLayout } from './TextBattleLayout'
import { VideoBattleLayout } from './VideoBattleLayout'
import { WorkflowBattleLayout } from './WorkflowBattleLayout'

/**
 * GRASP: Pure Fabrication + Protected Variations
 *
 * Maps (content_type, battle_type) → BattleLayoutStrategy.
 * Adding a new battle type only requires adding an entry here —
 * the controller (ImmersiveArenaView) never changes.
 *
 * Resolution order (highest priority first):
 *   1. battle_type override (e.g. workflow_battle always → WorkflowLayout)
 *   2. content_type mapping
 *   3. GenericBattleLayout fallback
 */

/** All registered layout strategies keyed by layout ID. */
const LAYOUT_REGISTRY: Record<string, BattleLayoutStrategy> = {
  text: { layoutId: 'text', Layout: TextBattleLayout },
  image: { layoutId: 'image', Layout: ImageBattleLayout },
  audio: { layoutId: 'audio', Layout: AudioBattleLayout },
  video: { layoutId: 'video', Layout: VideoBattleLayout },
  workflow: { layoutId: 'workflow', Layout: WorkflowBattleLayout },
  generic: { layoutId: 'generic', Layout: GenericBattleLayout },
}

/** Content-type → layout ID mapping. */
const CONTENT_TYPE_LAYOUT: Partial<Record<BattleContentType, string>> = {
  text: 'text',
  code: 'text',
  poem: 'text',
  kaggle: 'text',
  image: 'image',
  drawing: 'image',
  avatar: 'image',
  image_edit: 'image',
  audio: 'audio',
  video: 'video',
  workflow: 'workflow',
  map: 'generic',
}

/** Battle-type → layout ID override (takes precedence over content_type). */
const BATTLE_TYPE_LAYOUT: Partial<Record<BattleType, string>> = {
  workflow_battle: 'workflow',
}

/**
 * GRASP: Information Expert — this is the only place that knows the full
 * mapping from battle characteristics to layout strategy.
 *
 * Returns the most appropriate BattleLayoutStrategy for the given battle.
 */
export function resolveBattleLayout(battle: Battle): BattleLayoutStrategy {
  // 1. battle_type override
  if (battle.battle_type) {
    const override = BATTLE_TYPE_LAYOUT[battle.battle_type]
    if (override && LAYOUT_REGISTRY[override]) {
      return LAYOUT_REGISTRY[override]!
    }
  }

  // 2. content_type mapping
  if (battle.content_type) {
    const layoutId = CONTENT_TYPE_LAYOUT[battle.content_type as BattleContentType]
    if (layoutId && LAYOUT_REGISTRY[layoutId]) {
      return LAYOUT_REGISTRY[layoutId]!
    }
  }

  // 3. Fallback
  return LAYOUT_REGISTRY.text!
}

export { LAYOUT_REGISTRY, CONTENT_TYPE_LAYOUT, BATTLE_TYPE_LAYOUT }
