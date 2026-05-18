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
      tooltip: {
        summary: 'The image generation service provider.',
        executionImpact: 'Different providers support different models, pricing, and image quality. Available models depend on the selected provider.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The specific model to use for image generation.',
        format: 'Model identifier string (e.g. flux-pro, dall-e-3, sdxl-turbo). Available models depend on the provider.',
      },
    },
    {
      key: 'width',
      label: 'Width',
      type: 'number',
      defaultValue: '1024',
      min: 256,
      max: 4096,
      step: 64,
      tooltip: {
        summary: 'Output image width in pixels.',
        format: 'Integer between 256 and 4096, in multiples of 64.',
        commonMistakes: 'Using non-standard dimensions that the model does not support (e.g. DALL-E 3 only supports specific sizes).',
      },
    },
    {
      key: 'height',
      label: 'Height',
      type: 'number',
      defaultValue: '1024',
      min: 256,
      max: 4096,
      step: 64,
      tooltip: {
        summary: 'Output image height in pixels.',
        format: 'Integer between 256 and 4096, in multiples of 64.',
      },
    },
    {
      key: 'negativePrompt',
      label: 'Negative Prompt',
      type: 'textarea',
      tooltip: {
        summary: 'Describes what should NOT appear in the generated image.',
        format: 'Free-form text (e.g. "blurry, low quality, text, watermark").',
        executionImpact: 'Not all providers/models support negative prompts. Ignored if unsupported.',
      },
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      hint: 'Optional seed for reproducibility.',
      tooltip: {
        summary: 'A fixed random seed for reproducible image generation.',
        format: 'Any integer. Same seed + same prompt = same image.',
        executionImpact: 'Without a seed, each generation produces a different image even with identical prompts.',
      },
    },
    {
      key: 'steps',
      label: 'Steps',
      type: 'number',
      defaultValue: '30',
      min: 1,
      max: 150,
      tooltip: {
        summary: 'Number of diffusion steps. More steps generally produce higher quality but take longer.',
        format: 'Integer between 1 and 150.',
        executionImpact: 'Higher values increase generation time and cost linearly. Diminishing returns above 50 for most models.',
      },
    },
    {
      key: 'guidanceScale',
      label: 'Guidance Scale',
      type: 'number',
      defaultValue: '7.5',
      min: 1,
      max: 30,
      step: 0.5,
      tooltip: {
        summary: 'How closely the image follows the text prompt. Higher values are more literal.',
        format: 'Decimal between 1 and 30.',
        commonMistakes: 'Setting too high (>15) causes artifacts and over-saturation. Too low (<3) produces images that ignore the prompt.',
      },
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
      tooltip: {
        summary: 'The image-to-image transformation provider.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The model used for image transformation.',
        format: 'Provider-specific model identifier.',
      },
    },
    {
      key: 'strength',
      label: 'Strength',
      type: 'number',
      defaultValue: '0.7',
      min: 0,
      max: 1,
      step: 0.05,
      tooltip: {
        summary: 'How much the output differs from the input image. 0 = identical, 1 = completely different.',
        format: 'Decimal between 0 and 1.',
        commonMistakes: 'Setting too high (0.9+) loses the original composition. Setting too low (0.1) produces barely visible changes.',
      },
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      tooltip: {
        summary: 'Fixed random seed for reproducible transformations.',
      },
    },
    {
      key: 'negativePrompt',
      label: 'Negative Prompt',
      type: 'textarea',
      tooltip: {
        summary: 'Describes elements to exclude from the transformed image.',
      },
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
      tooltip: {
        summary: 'The provider for image-to-audio conversion.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The model used to generate audio from an image.',
        format: 'Provider-specific model identifier.',
      },
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
      tooltip: {
        summary: 'The audio generation style. Descriptive narration describes the image, ambient creates soundscapes, musical creates melodies.',
      },
    },
    {
      key: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      defaultValue: '30',
      min: 1,
      max: 300,
      tooltip: {
        summary: 'Target duration of the generated audio in seconds.',
        format: 'Integer between 1 and 300.',
        executionImpact: 'Longer durations increase generation time and cost.',
      },
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      tooltip: {
        summary: 'The language for narration-style audio. Only applicable for descriptive narration style.',
        format: 'ISO 639-1 code (e.g. en, tr).',
      },
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
      tooltip: {
        summary: 'The text-to-speech provider. Different providers offer different voices and quality levels.',
      },
    },
    {
      key: 'voice',
      label: 'Voice',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The voice identifier to use for speech synthesis.',
        format: 'Provider-specific voice ID (e.g. "alloy" for OpenAI, a voice UUID for ElevenLabs).',
        commonMistakes: 'Using a voice ID from one provider with a different provider.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      tooltip: {
        summary: 'The TTS model to use. Uses the provider default if omitted.',
        format: 'Provider-specific model name (e.g. tts-1, tts-1-hd for OpenAI).',
      },
    },
    {
      key: 'speed',
      label: 'Speed',
      type: 'number',
      defaultValue: '1.0',
      min: 0.25,
      max: 4.0,
      step: 0.25,
      tooltip: {
        summary: 'Playback speed multiplier for the generated speech.',
        format: 'Decimal between 0.25 (very slow) and 4.0 (very fast). 1.0 = normal speed.',
      },
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
      tooltip: {
        summary: 'The audio file format for the generated speech.',
        executionImpact: 'MP3 is smallest. WAV is lossless but larger. OGG is a good balance.',
      },
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
      tooltip: {
        summary: 'The speech-to-text provider.',
        executionImpact: 'OpenAI Whisper handles many languages well. Google offers real-time streaming support.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      tooltip: {
        summary: 'The STT model to use. Uses the provider default if omitted.',
        format: 'Provider-specific model name (e.g. whisper-1 for OpenAI).',
      },
    },
    {
      key: 'language',
      label: 'Language',
      type: 'text',
      placeholder: 'ISO 639-1',
      tooltip: {
        summary: 'The expected language of the audio. Improves transcription accuracy.',
        format: 'ISO 639-1 code (e.g. en, tr). Leave empty for auto-detection.',
      },
    },
    {
      key: 'timestamps',
      label: 'Include Timestamps',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to include word or segment timestamps in the transcription.',
        executionImpact: 'When true, the segments output contains start/end times. Useful for subtitles.',
      },
    },
    {
      key: 'diarize',
      label: 'Speaker Diarization',
      type: 'boolean',
      defaultValue: 'false',
      tooltip: {
        summary: 'Whether to identify and label different speakers in the audio.',
        executionImpact: 'Adds speaker labels to each segment. Increases processing time. Not all providers support diarization.',
      },
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
      tooltip: {
        summary: 'The video generation provider.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      tooltip: {
        summary: 'The specific video generation model to use.',
        format: 'Provider-specific model identifier.',
      },
    },
    {
      key: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      defaultValue: '5',
      min: 1,
      max: 30,
      tooltip: {
        summary: 'Target video length in seconds.',
        format: 'Integer between 1 and 30.',
        executionImpact: 'Longer videos cost significantly more and take longer to generate. Most models cap at 4-10 seconds.',
      },
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
      tooltip: {
        summary: 'The aspect ratio of the generated video.',
        commonMistakes: 'Using 9:16 (portrait) when downstream expects landscape, or vice versa.',
      },
    },
    {
      key: 'fps',
      label: 'FPS',
      type: 'number',
      defaultValue: '24',
      min: 12,
      max: 60,
      tooltip: {
        summary: 'Frames per second of the generated video.',
        format: 'Integer between 12 and 60. 24 is cinematic standard.',
        executionImpact: 'Higher FPS produces smoother video but increases file size and generation cost.',
      },
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
      tooltip: {
        summary: 'The image upscaling provider.',
      },
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
      tooltip: {
        summary: 'How much to enlarge the image. 4x means a 512px image becomes 2048px.',
        executionImpact: '8x produces very large files and takes longer. Use 2x for subtle enhancement.',
      },
    },
    {
      key: 'model',
      label: 'Model',
      type: 'text',
      tooltip: {
        summary: 'The upscaling model to use. Uses the provider default if omitted.',
        format: 'Provider-specific model identifier.',
      },
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
      tooltip: {
        summary: 'The image format for the upscaled output.',
        executionImpact: 'PNG is lossless but larger. WebP is a good balance. JPEG is smallest but lossy.',
      },
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
      tooltip: {
        summary: 'The target media format to convert the input to.',
        format: 'File extension (e.g. webp, mp3, mp4, png, wav).',
      },
    },
    {
      key: 'quality',
      label: 'Quality',
      type: 'number',
      defaultValue: '85',
      min: 1,
      max: 100,
      tooltip: {
        summary: 'Output quality level for lossy formats.',
        format: 'Integer between 1 (lowest) and 100 (highest). Only applies to lossy formats (JPEG, WebP, MP3).',
        executionImpact: 'Lower quality = smaller file size. Higher quality = larger file. Lossless formats ignore this.',
      },
    },
    {
      key: 'codec',
      label: 'Codec',
      type: 'text',
      tooltip: {
        summary: 'The encoding codec to use. Auto-selected based on output format if omitted.',
        format: 'Codec name (e.g. h264, h265, vp9, aac, opus).',
      },
    },
    {
      key: 'bitrate',
      label: 'Bitrate',
      type: 'text',
      tooltip: {
        summary: 'Target bitrate for audio/video encoding.',
        format: 'String with unit (e.g. 128k, 2M, 5M). Auto-selected if omitted.',
      },
    },
    {
      key: 'resize',
      label: 'Resize',
      type: 'key_value',
      placeholder: 'Property',
      hint: 'Set width, height, and fit (cover/contain/fill).',
      tooltip: {
        summary: 'Optional resize dimensions applied during conversion.',
        format: 'Key-value: width (pixels), height (pixels), fit (cover/contain/fill).',
        executionImpact: 'Resizing during conversion is more efficient than a separate resize step.',
      },
    },
  ],
  outputFields: [
    { key: 'url', type: 'string', description: 'Converted media URL' },
    { key: 'size', type: 'number', description: 'Output file size in bytes' },
  ],
}
