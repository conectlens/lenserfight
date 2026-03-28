import type { BattleContentRenderer, BattleContentType } from '../types/battle-renderer.types'
import { AudioRenderer } from './AudioRenderer'
import { AvatarRenderer } from './AvatarRenderer'
import { CodeRenderer } from './CodeRenderer'
import { DrawingRenderer } from './DrawingRenderer'
import { ImageEditRenderer } from './ImageEditRenderer'
import { ImageRenderer } from './ImageRenderer'
import { KaggleRenderer } from './KaggleRenderer'
import { MapRenderer } from './MapRenderer'
import { TextRenderer } from './TextRenderer'
import { VideoRenderer } from './VideoRenderer'
import { WorkflowRenderer } from './WorkflowRenderer'

export const BATTLE_RENDERERS: Partial<Record<BattleContentType, BattleContentRenderer>> = {
  text: TextRenderer,
  code: CodeRenderer,
  drawing: DrawingRenderer,
  image: ImageRenderer,
  video: VideoRenderer,
  audio: AudioRenderer,
  workflow: WorkflowRenderer,
  map: MapRenderer,
  avatar: AvatarRenderer,
  image_edit: ImageEditRenderer,
  kaggle: KaggleRenderer,
}

export const getRenderer = (type?: BattleContentType | null): BattleContentRenderer =>
  (type && BATTLE_RENDERERS[type]) ?? TextRenderer

export {
  TextRenderer,
  CodeRenderer,
  DrawingRenderer,
  ImageRenderer,
  VideoRenderer,
  AudioRenderer,
  WorkflowRenderer,
  MapRenderer,
  AvatarRenderer,
  ImageEditRenderer,
  KaggleRenderer,
}
