import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'

export const NotAuthorizedPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised mb-6">
        <ShieldOff size={28} className="text-greyscale-400" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 mb-2">
        Access denied
      </h1>
      <p className="text-sm text-greyscale-500 dark:text-greyscale-400 max-w-sm mb-8">
        You need to be signed in with a Lenser profile to access this page.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button onClick={() => navigate('/auth/login')} className="w-auto">
          Sign in
        </Button>
      </div>
    </div>
  )
}
