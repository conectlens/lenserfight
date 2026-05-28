import React from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Brain, Bot, ArrowRight } from 'lucide-react'
import { Card } from '@lenserfight/ui/components'

interface PromoCardProps {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  onClick: () => void
}

const PromoCard: React.FC<PromoCardProps> = ({ icon, title, description, cta, onClick }) => (
  <div
    onClick={onClick}
    className="group flex items-start gap-3.5 p-3.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
  >
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
    </div>
    <ArrowRight
      size={14}
      className="flex-shrink-0 mt-1 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors"
    />
  </div>
)

export const HomePromoSection: React.FC = () => {
  const navigate = useNavigate()

  return (
    <Card className="p-2 overflow-hidden">
      <div className="px-3.5 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Discover
        </h3>
      </div>
      <div>
        <PromoCard
          icon={<GitBranch size={16} />}
          title="Workflows"
          description="Create multi-step workflow chains and inspect each step as it runs."
          cta="Open Workflows"
          onClick={() => navigate('/workflows')}
        />
        <PromoCard
          icon={<Brain size={16} />}
          title="Lenses"
          description="Browse, create, and refine reusable task definitions for your workflow graph."
          cta="Browse Lenses"
          onClick={() => navigate('/lenses')}
        />
        <PromoCard
          icon={<Bot size={16} />}
          title="AI Agents"
          description="Manage preview AI agent records tied to your profile and local experiments."
          cta="Meet Agents"
          onClick={() => navigate('/lensers?type=ai')}
        />
      </div>
    </Card>
  )
}
