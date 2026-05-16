/**
 * CM — Media node config descriptors.
 *
 * Covers: text_to_image, image_to_image, image_to_audio, text_to_speech,
 *         speech_to_text, text_to_video, image_upscale, media_convert.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const textToImageDescriptor: RunnerConfigDescriptor = {
  nodeType: 'text_to_image',
  displayName: 'Text to Image',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'fal.ai', value: 'fal-ai' },
        { label: 'OpenAI', value: 'openai' },
        { label: 'Stability', value: 'stability' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
    },
    {
      key: 'width',
      label: 'Width',
      type: 'number',
      defaultValue: '1024',
      min: 256,
      max: 4096,
      step: 64,
    },
    {
      key: 'height',
      label: 'Height',
      type: 'number',
      defaultValue: '1024',
      min: 256,
      max: 4096,
      step: 64,
    },
    {
      key: 'negativePrompt',
      label: 'Negative Prompt',
      type: 'textarea',
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      hint: 'Optional seed for reproducibility.',
    },
    {
      key: 'steps',
      label: 'Steps',
      type: 'number',
      defaultValue: '30',
      min: 1,
      max: 150,
    },
    {
      key: 'guidanceScale',
      label: 'Guidance Scale',
      type: 'number',
      defaultValue: '7.5',
      min: 1,
      max: 30,
      step: 0.5,
    },
  ],
  outputFields: [
    { key: 'imageUrl', type: 'string', description: 'Generated image URL' },
    { key: 'metadata', type: 'object', description: 'Generation metadata' },
  ],
}

export const imageToImageDescriptor: RunnerConfigDescriptor = {
  nodeType: 'image_to_image',
  displayName: 'Image to Image',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'fal.ai', value: 'fal-ai' },
        { label: 'Stability', value: 'stability' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
    },
    {
      key: 'strength',
      label: 'Strength',
      type: 'number',
      defaultValue: '0.7',
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
    },
    {
      key: 'negativePrompt',
      label: 'Negative Prompt',
      type: 'textarea',
    },
  ],
  outputFields: [
    { key: 'imageUrl', type: 'string', description: 'Transformed image URL' },
  ],
}

export const imageToAudioDescriptor: RunnerConfigDescriptor = {
  nodeType: 'image_to_audio',
  displayName: 'Image to Audio',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'fal.ai', value: 'fal-ai' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
    },
    {
      key: 'style',
      label: 'Style',
      type: 'select',
      defaultValue: 'descriptive_narration',
      options: [
        { label: 'Descriptive Narration', value: 'descriptive_narration' },
        { label: 'Ambient Soundscape', value: 'ambient_soundscape' },
        { label: 'Musical', value: 'musical' },
      ],
    },
    {
      key: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      defaultValue: '30',
      min: 1,
      max: 300,
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
    },
  ],
  outputFields: [
    { key: 'audioUrl', type: 'string', description: 'Generated audio URL' },
    { key: 'durationMs', type: 'number', description: 'Audio duration in ms' },
  ],
}

export const textToSpeechDescriptor: RunnerConfigDescriptor = {
  nodeType: 'text_to_speech',
  displayName: 'Text to Speech',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'OpenAI', value: 'openai' },
        { label: 'ElevenLabs', value: 'elevenlabs' },
        { label: 'Google', value: 'google' },
      ],
    },
    {
      key: 'voice',
      label: 'Voice',
      type: 'text',
      required: true,
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
    },
    {
      key: 'speed',
      label: 'Speed',
      type: 'number',
      defaultValue: '1.0',
      min: 0.25,
      max: 4.0,
      step: 0.25,
    },
    {
      key: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      defaultValue: 'mp3',
      options: [
        { label: 'MP3', value: 'mp3' },
        { label: 'WAV', value: 'wav' },
        { label: 'OGG', value: 'ogg' },
      ],
    },
  ],
  outputFields: [
    { key: 'audioUrl', type: 'string', description: 'Generated audio URL' },
    { key: 'durationMs', type: 'number', description: 'Audio duration in ms' },
  ],
}

export const speechToTextDescriptor: RunnerConfigDescriptor = {
  nodeType: 'speech_to_text',
  displayName: 'Speech to Text',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'OpenAI', value: 'openai' },
        { label: 'Google', value: 'google' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'ISO 639-1',
    },
    {
      key: 'timestamps',
      label: 'Include Timestamps',
      type: 'boolean',
      defaultValue: 'true',
    },
    {
      key: 'diarize',
      label: 'Speaker Diarization',
      type: 'boolean',
      defaultValue: 'false',
    },
  ],
  outputFields: [
    { key: 'transcript', type: 'string', description: 'Transcribed text' },
    { key: 'segments', type: 'array', description: 'Timestamped segments' },
  ],
}

export const textToVideoDescriptor: RunnerConfigDescriptor = {
  nodeType: 'text_to_video',
  displayName: 'Text to Video',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'fal.ai', value: 'fal-ai' },
        { label: 'Runway', value: 'runway' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
    },
    {
      key: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 30,
    },
    {
      key: 'aspectRatio',
      label: 'Aspect Ratio',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
      ],
    },
    {
      key: 'fps',
      label: 'FPS',
      type: 'number',
      defaultValue: '24',
      min: 12,
      max: 60,
    },
  ],
  outputFields: [
    { key: 'videoUrl', type: 'string', description: 'Generated video URL' },
    { key: 'durationMs', type: 'number', description: 'Video duration in ms' },
  ],
}

export const imageUpscaleDescriptor: RunnerConfigDescriptor = {
  nodeType: 'image_upscale',
  displayName: 'Image Upscale',
  category: 'media',
  needsAiProvider: true,
  fields: [
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      required: true,
      options: [
        { label: 'fal.ai', value: 'fal-ai' },
        { label: 'Stability', value: 'stability' },
      ],
    },
    {
      key: 'scale',
      label: 'Scale Factor',
      type: 'select',
      required: true,
      defaultValue: '4',
      options: [
        { label: '2x', value: '2' },
        { label: '4x', value: '4' },
        { label: '8x', value: '8' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
    },
    {
      key: 'outputFormat',
      label: 'Output Format',
      type: 'select',
      defaultValue: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'WebP', value: 'webp' },
        { label: 'JPEG', value: 'jpeg' },
      ],
    },
  ],
  outputFields: [
    { key: 'imageUrl', type: 'string', description: 'Upscaled image URL' },
    { key: 'dimensions', type: 'object', description: 'New width and height' },
  ],
}

export const mediaConvertDescriptor: RunnerConfigDescriptor = {
  nodeType: 'media_convert',
  displayName: 'Media Convert',
  category: 'media',
  fields: [
    {
      key: 'outputFormat',
      label: 'Output Format',
      type: 'text',
      required: true,
      placeholder: 'webp, mp3, mp4',
    },
    {
      key: 'quality',
      label: 'Quality',
      type: 'number',
      defaultValue: '85',
      min: 1,
      max: 100,
    },
    {
      key: 'codec',
      label: 'Codec',
      type: 'text',
    },
    {
      key: 'bitrate',
      label: 'Bitrate',
      type: 'text',
    },
    {
      key: 'resize',
      label: 'Resize',
      type: 'json',
      hint: '{ width, height, fit }',
    },
  ],
  outputFields: [
    { key: 'url', type: 'string', description: 'Converted media URL' },
    { key: 'size', type: 'number', description: 'Output file size in bytes' },
  ],
}
