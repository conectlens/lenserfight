/**
 * Maps battle content_type values to the output modality required from an
 * AI model.  Used by BattleCreationValidator to check whether the selected
 * model can actually produce the expected output.
 *
 * The keys are BattleContentType values; the values are the corresponding
 * model output_modality strings (matching ai.models.output_modalities).
 */

import type { BattleContentType } from './battle.constants'

export const CONTENT_TYPE_TO_MODALITY: Record<BattleContentType, string> = {
  text: 'text',
  code: 'text',
  poem: 'text',
  drawing: 'image',
  image: 'image',
  avatar: 'image',
  image_edit: 'image',
  video: 'video',
  audio: 'audio',
  workflow: 'text',
  map: 'text',
  kaggle: 'text',
}

/**
 * Content types that a human can reasonably produce through the standard
 * product UI (text input, code editor, or drawing/upload interface).
 *
 * If a human contender is selected for a battle with a content type NOT in
 * this list, the validator emits a warning or error depending on whether
 * an experimental override is available.
 */
export const HUMAN_PRODUCIBLE_CONTENT_TYPES: readonly BattleContentType[] = [
  'text',
  'code',
  'poem',
]

/**
 * Content types that require specialized renderers for judging.
 * Text-based types can always be judged; media types require corresponding
 * player/viewer components.
 */
export const MEDIA_CONTENT_TYPES: readonly BattleContentType[] = [
  'image',
  'drawing',
  'avatar',
  'image_edit',
  'video',
  'audio',
]
