import React from 'react'
import { useParams } from 'react-router-dom'
import { ImmersiveArenaView } from '../components/arena/ImmersiveArenaView'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  return <ImmersiveArenaView slug={slug ?? ''} />
}
