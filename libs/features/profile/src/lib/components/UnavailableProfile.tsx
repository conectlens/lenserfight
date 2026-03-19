import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UserX } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'

export const UnavailableProfile: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400 dark:text-gray-500">
          <UserX size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          This profile is unavailable
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          The account you're looking for may have been deactivated, deleted, or is otherwise unavailable.
        </p>
        <Button onClick={() => navigate('/')} className="!w-auto px-6" variant="ghost">
          Return Home
        </Button>
      </div>
    </div>
  )
}
