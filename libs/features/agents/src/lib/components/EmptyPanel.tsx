import { EmptyState } from '@lenserfight/ui/components'
import React from 'react'

interface EmptyPanelProps {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}

export const EmptyPanel: React.FC<EmptyPanelProps> = ({
  icon,
  title,
  description,
  children,
}) => (
  <EmptyState icon={icon} title={title} description={description} action={children} />
)
