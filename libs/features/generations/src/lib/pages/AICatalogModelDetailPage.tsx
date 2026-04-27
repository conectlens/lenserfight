import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AICatalogModelDetail } from '../components/AICatalogModelDetail'
import { useAICatalogModelDetail } from '../hooks/useAICatalog'
import { Loader } from '@lenserfight/ui/feedback'
import { PageHeader, Stack } from '@lenserfight/ui/layout'
import { Button } from '@lenserfight/ui/components'
import { ChevronLeft } from 'lucide-react'
import { Surface } from '@lenserfight/ui/primitives'

export const AICatalogModelDetailPage: React.FC = () => {
  const { providerKey, modelKey } = useParams<{ providerKey: string; modelKey: string }>()
  const navigate = useNavigate()
  
  const { data: model, isLoading } = useAICatalogModelDetail(providerKey, modelKey)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader message="Fetching model specifications..." />
      </div>
    )
  }

  if (!model) {
    return (
      <Surface variant="inset" className="p-12 rounded-[32px] text-center">
        <Stack gap="gap-4" align="center">
          <PageHeader 
            title="Model not found" 
            description="The requested model could not be located in the LenserFight AI catalog."
          />
          <Button onClick={() => navigate('/ai/catalog')}>
            Return to Catalog
          </Button>
        </Stack>
      </Surface>
    )
  }

  return (
    <Stack gap="gap-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => navigate('/ai/catalog')}
          className="rounded-xl"
        >
          <ChevronLeft size={18} />
          Back to Catalog
        </Button>
      </div>

      <AICatalogModelDetail model={model} />
    </Stack>
  )
}
