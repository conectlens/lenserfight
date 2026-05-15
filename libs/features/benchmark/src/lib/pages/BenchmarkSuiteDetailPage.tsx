import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, ClipboardList, GitBranch } from 'lucide-react'
import { Button, SEOHead } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { benchmarkService, workflowsService } from '@lenserfight/data/repositories'
import { BenchmarkSuiteStatus } from '@lenserfight/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { useBenchmarkSuite } from '../hooks/useBenchmarkSuite'

const STATUS_COLORS: Record<BenchmarkSuiteStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export const BenchmarkSuiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser: currentUser } = useLenser()
  const queryClient = useQueryClient()

  const { suite: suiteQuery, tasks: tasksQuery } = useBenchmarkSuite(id)
  const suite = suiteQuery.data
  const tasks = tasksQuery.data ?? []

  const isOwner = !!currentUser && suite?.creator_lenser_id === currentUser.id

  const [addingTask, setAddingTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')
  const [taskReps, setTaskReps] = useState(1)
  const [attachWorkflow, setAttachWorkflow] = useState(false)
  const [workflowQuery, setWorkflowQuery] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [selectedWorkflowTitle, setSelectedWorkflowTitle] = useState<string>('')

  const { data: workflowSearchResults = [] } = useQuery({
    queryKey: ['workflow-search-benchmark', workflowQuery],
    queryFn: async () => {
      if (!currentUser?.id) return []
      const results = await workflowsService.listByLenser(currentUser.id)
      return results.filter((w) => w.title.toLowerCase().includes(workflowQuery.toLowerCase()))
    },
    enabled: attachWorkflow && workflowQuery.length >= 0,
    staleTime: 10_000,
  })

  const handleAddTask = async () => {
    if (!id || !taskTitle.trim() || !taskPrompt.trim()) return
    await benchmarkService.createTask({
      suite_id: id,
      title: taskTitle.trim(),
      prompt_template: taskPrompt.trim(),
      required_repetitions: taskReps,
      ordinal: tasks.length,
      workflow_id: attachWorkflow ? selectedWorkflowId : null,
    })
    queryClient.invalidateQueries({ queryKey: queryKeys.benchmark.tasks(id) })
    setAddingTask(false)
    setTaskTitle('')
    setTaskPrompt('')
    setTaskReps(1)
    setAttachWorkflow(false)
    setSelectedWorkflowId(null)
    setSelectedWorkflowTitle('')
    setWorkflowQuery('')
  }

  if (suiteQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 space-y-4">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center text-gray-400 dark:text-gray-500">
        Benchmark suite not found.
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-6">
      <SEOHead type="default" overrideTitle={suite.title} />

      {/* Back */}
      <Button
        variant="ghost"
        onClick={() => navigate('/benchmark')}
        className="flex items-center gap-1 w-auto mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Benchmarks
      </Button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{suite.title}</h1>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[suite.status]}`}>
            {suite.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {suite.category && <span>{suite.category}</span>}
          <span>v{suite.version}</span>
          <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        </div>
        {suite.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{suite.description}</p>
        )}
      </div>

      {/* Tasks header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Tasks
        </h2>
        {isOwner && suite.status !== 'archived' && (
          <Button
            variant="ghost"
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 w-auto text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Add task form */}
      {addingTask && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-700 space-y-3">
          <input
            autoFocus
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            placeholder="Prompt template"
            value={taskPrompt}
            onChange={(e) => setTaskPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">Repetitions:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={taskReps}
              onChange={(e) => setTaskReps(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Workflow attachment toggle */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setAttachWorkflow((v) => !v); setSelectedWorkflowId(null); setSelectedWorkflowTitle(''); setWorkflowQuery('') }}
              className="!px-0 !py-0 !rounded-none !font-medium text-gray-500 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-transparent"
            >
              <GitBranch size={13} />
              {attachWorkflow ? 'Remove workflow' : 'Attach a workflow'}
            </Button>
            {attachWorkflow && (
              <div className="space-y-2">
                {selectedWorkflowId ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20">
                    <GitBranch size={13} className="text-indigo-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">{selectedWorkflowTitle}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedWorkflowId(null); setSelectedWorkflowTitle('') }} className="!px-0 !py-0 !rounded-none !font-medium text-gray-400 hover:bg-transparent hover:text-red-500 hover:border-transparent">×</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      placeholder="Search your workflows…"
                      value={workflowQuery}
                      onChange={(e) => setWorkflowQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {workflowSearchResults.length > 0 && (
                      <ul className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                        {workflowSearchResults.slice(0, 5).map((w) => (
                          <li key={w.id}>
                            <Button
                              type="button"
                              onClick={() => { setSelectedWorkflowId(w.id); setSelectedWorkflowTitle(w.title) }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <GitBranch size={12} className="text-gray-400" />
                              {w.title}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {workflowSearchResults.length === 0 && workflowQuery.length > 0 && (
                      <p className="text-xs text-gray-400 px-1">No workflows found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => { setAddingTask(false); setTaskTitle(''); setTaskPrompt(''); setTaskReps(1); setAttachWorkflow(false); setSelectedWorkflowId(null); setSelectedWorkflowTitle(''); setWorkflowQuery('') }}
              className="w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!taskTitle.trim() || !taskPrompt.trim()}
              className="w-auto"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasksQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks yet.</p>
          {isOwner && <p className="text-xs mt-1">Add a task to get started.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
            >
              <span className="w-6 shrink-0 text-center text-xs font-bold text-gray-400 pt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {task.prompt_template}
                </p>
                {task.workflow_id && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <GitBranch size={11} className="text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">Workflow attached</span>
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 pt-0.5">
                ×{task.required_repetitions}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
