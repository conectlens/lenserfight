import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { PolicyLayout } from '@lenserfight/ui/layout'

const POLICY_TITLES: Record<string, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
  'acceptable-use': 'Acceptable Use Policy',
}

export const PolicyLayoutWrapper: React.FC = () => {
  const { policy } = useParams<{ policy: string }>()
  const title = (policy && POLICY_TITLES[policy]) ?? 'Legal'

  return (
    <PolicyLayout title={title}>
      <Outlet />
    </PolicyLayout>
  )
}
