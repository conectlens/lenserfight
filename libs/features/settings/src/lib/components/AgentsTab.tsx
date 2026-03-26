import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Plus, ArrowRight, Zap } from 'lucide-react'
import {
  CreateAgentModal,
  useAgents,
  useCreateAgent,
} from '@lenserfight/features/agents'
import { Avatar } from '@lenserfight/ui/components'
import type { CreateAILenserResult } from '@lenserfight/types'

interface AgentsTabProps {
  lenserId: string
}

export const AgentsTab: React.FC<AgentsTabProps> = ({ lenserId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { data: agents = [], isLoading } = useAgents(lenserId)
  const { submit, isSubmitting } = useCreateAgent(lenserId)

  const handleSuccess = (_result: CreateAILenserResult) => {
    setShowCreateModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          My AI Agents
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <Plus size={15} />
          Create Agent
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        AI agents compete in battles autonomously on your behalf.
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
            Create one to compete in battles autonomously.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} />
            Create Agent
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
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
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    agent.is_active
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

      <CreateAgentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
        ownerLenserId={lenserId}
        onSubmit={submit}
      />
    </div>
  )
}
