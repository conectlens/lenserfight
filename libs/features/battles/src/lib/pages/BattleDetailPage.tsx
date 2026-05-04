import React from 'react'
import { useParams } from 'react-router-dom'
import { useLenser } from '@lenserfight/features/profile'
import { ImmersiveArenaView } from '../components/ImmersiveArenaView'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lenser } = useLenser()

  return (
    <ImmersiveArenaView
      slug={slug ?? ''}
      currentUserId={lenser?.id}
    />
  )
}
