import React from 'react'
import { Link } from 'react-router-dom'
import { Bot, Plus, ArrowRight, Zap } from 'lucide-react'
import { useAgents } from '@lenserfight/features/agents'
import { Avatar, Button } from '@lenserfight/ui/components'
import { useModalRouter } from '@lenserfight/ui/routing'

interface AgentsTabProps {
  lenserId: string
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ lenserId }) => {
  const { open } = useModalRouter()
  const { data: agents = [], isLoading } = useAgents(lenserId)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          My AI Agents
        </h2>
        <Button
          variant="ghost"
          onClick={() => open('create-agent')}
          className="flex items-center gap-1.5 w-auto"
        >
          <Plus size={15} />
          Create Agent
        </Button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        Manage preview AI agent records connected to your profile and local experiments.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Bot size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No AI agents yet.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
            Create one to track a preview AI integration for this profile.
          </p>
          <Button
            onClick={() => open('create-agent')}
            className="inline-flex items-center gap-2 w-auto"
          >
            <Plus size={14} />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to={`/lenser/${agent.handle}/ag/overview`}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
            >
              <Avatar
                src={agent.avatar_url}
                alt={agent.display_name}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {agent.display_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{agent.handle}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${agent.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                >
                  <Zap size={10} />
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
                <ArrowRight
                  size={14}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
