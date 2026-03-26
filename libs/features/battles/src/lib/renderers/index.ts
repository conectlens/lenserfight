import type { BattleContentRenderer, BattleContentType } from '../types/battle-renderer.types'
import { TextRenderer } from './TextRenderer'

export const BATTLE_RENDERERS: Partial<Record<BattleContentType, BattleContentRenderer>> = {
  text: TextRenderer,
}

export const getRenderer = (type?: BattleContentType | null): BattleContentRenderer =>
  (type && BATTLE_RENDERERS[type]) ?? TextRenderer
