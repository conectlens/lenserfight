import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useUI } from '@lenserfight/ui/providers'
import { CreateThreadModal } from '../components/CreateThreadModal'

export const ThreadComposePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setPageTitle } = useUI()
  const body = searchParams.get('body') ?? ''

  useEffect(() => {
    setPageTitle('New Post')
    return () => setPageTitle(null)
  }, [setPageTitle])

  return (
    <CreateThreadModal
      isOpen={true}
      onClose={() => navigate(-1)}
      onSuccess={(id) => navigate(id ? `/threads/${id}` : '/app')}
      initialContent={body || undefined}
    />
  )
}
