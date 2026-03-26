import type { BattleContentRenderer, BattleContentType } from '../types/battle-renderer.types'
import { AudioRenderer } from './AudioRenderer'
import { ImageRenderer } from './ImageRenderer'
import { TextRenderer } from './TextRenderer'
import { VideoRenderer } from './VideoRenderer'
import { WorkflowRenderer } from './WorkflowRenderer'

export const BATTLE_RENDERERS: Partial<Record<BattleContentType, BattleContentRenderer>> = {
  text: TextRenderer,
  image: ImageRenderer,
  video: VideoRenderer,
  audio: AudioRenderer,
  workflow: WorkflowRenderer,
}

export const getRenderer = (type?: BattleContentType | null): BattleContentRenderer =>
  (type && BATTLE_RENDERERS[type]) ?? TextRenderer

export { TextRenderer, ImageRenderer, VideoRenderer, AudioRenderer, WorkflowRenderer }
