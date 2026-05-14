import React from 'react'
import { useParams } from 'react-router-dom'
import { seoService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { ExportButton } from '@lenserfight/features/exports'
import { PageMeta } from '@lenserfight/ui/layout'
import { useBattle } from '../hooks/query/useBattle'
import { BattleWebhookSubscriptions } from '../components/BattleWebhookSubscriptions'
import { ImmersiveArenaView } from '../components/arena/ImmersiveArenaView'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { lenser } = useLenser()
  const { data: battle } = useBattle(slug)

  const isOwner = !!(
    user &&
    battle?.creator_lenser_id &&
    lenser?.id &&
    battle.creator_lenser_id === lenser.id
  )

  const battleMeta = seoService.getBattleMeta(battle ?? null)

  return (
    <>
      <PageMeta
        title={battleMeta.title}
        description={battleMeta.description}
        ogImage={battle?.og_image_url ?? undefined}
        ogType="article"
      />
      <ImmersiveArenaView slug={slug ?? ''} />
    </>
  )
}
