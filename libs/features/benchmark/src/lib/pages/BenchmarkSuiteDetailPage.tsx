import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, ClipboardList } from 'lucide-react'
import { SEOHead } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { benchmarkService } from '@lenserfight/data/repositories'
import { BenchmarkSuiteStatus } from '@lenserfight/types'
import { useQueryClient } from '@tanstack/react-query'
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

  const handleAddTask = async () => {
    if (!id || !taskTitle.trim() || !taskPrompt.trim()) return
    await benchmarkService.createTask({
      suite_id: id,
      title: taskTitle.trim(),
      prompt_template: taskPrompt.trim(),
      required_repetitions: taskReps,
      ordinal: tasks.length,
    })
    queryClient.invalidateQueries({ queryKey: queryKeys.benchmark.tasks(id) })
    setAddingTask(false)
    setTaskTitle('')
    setTaskPrompt('')
    setTaskReps(1)
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
      <button
        onClick={() => navigate('/benchmark')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Benchmarks
      </button>

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
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
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
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAddingTask(false); setTaskTitle(''); setTaskPrompt(''); setTaskReps(1) }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              disabled={!taskTitle.trim() || !taskPrompt.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
            >
              Add
            </button>
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
