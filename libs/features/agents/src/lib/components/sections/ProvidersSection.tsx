import { AICatalogShowroom } from '@lenserfight/features/generations'
import React from 'react'

import { SectionPage } from './SectionPage'

export const ProvidersSection: React.FC = () => (
  <SectionPage
    eyebrow="Providers"
    title="Runtime providers"
    description="Anthropic, OpenAI, Mistral, Gemini, fal.ai, ElevenLabs, Stability AI, Ollama, and others. Phase 3 adds per-provider BYOK configuration, health checks, and model sync."
  >
    <AICatalogShowroom embedded focus="providers" title="Provider showroom" />
  </SectionPage>
)
