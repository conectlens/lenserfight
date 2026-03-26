import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CreateBattleWizard } from '../components/CreateBattleWizard'

export function CreateBattlePage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <CreateBattleWizard
        onSuccess={(slug) => navigate(`/battles/${slug}`)}
        onClose={() => navigate('/battles')}
      />
    </div>
  )
}
