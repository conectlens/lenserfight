import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { lensDetailPath } from '@lenserfight/features/lenses'

/** Legacy `/lenses/:id` → `/lenses/:id/main` */
export const LensVersionRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to="/lenses" replace />
  return <Navigate to={lensDetailPath(id, 'main')} replace />
}
