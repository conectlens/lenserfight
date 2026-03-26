import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FlaskConical } from 'lucide-react'
import { SEOHead } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { benchmarkService } from '@lenserfight/data/repositories'
import { BenchmarkSuiteStatus } from '@lenserfight/types'
import { useBenchmarkSuites } from '../hooks/useBenchmarkSuites'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'

const STATUS_COLORS: Record<BenchmarkSuiteStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export const BenchmarkSuitesPage: React.FC = () => {
  const navigate = useNavigate()
  const { lenser: currentUser } = useLenser()
  const queryClient = useQueryClient()

  // public suites + current user's drafts
  const { data: publicSuites, isLoading: publicLoading } = useBenchmarkSuites()
  const { data: mySuites } = useBenchmarkSuites(currentUser?.id)

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')

  const mergedSuites = React.useMemo(() => {
    if (!mySuites) return publicSuites ?? []
    const publicIds = new Set((publicSuites ?? []).map((s) => s.id))
    const draftOwn = mySuites.filter((s) => s.status === 'draft' && !publicIds.has(s.id))
    return [...(publicSuites ?? []), ...draftOwn]
  }, [publicSuites, mySuites])

  const handleCreate = async () => {
    if (!currentUser || !title.trim()) return
    const suite = await benchmarkService.createSuite(
      { title: title.trim(), category: category.trim() || undefined },
      currentUser.id
    )
    queryClient.invalidateQueries({ queryKey: queryKeys.benchmark.suites(currentUser.id) })
    navigate(`/benchmark/${suite.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
      <SEOHead type="default" overrideTitle="Benchmarks" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benchmarks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Reproducible evaluation suites for battle comparisons.
          </p>
        </div>
        {currentUser && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Suite</span>
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Benchmark Suite</h2>
          <input
            autoFocus
            placeholder="Suite title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setCreating(false); setTitle(''); setCategory('') }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {publicLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mergedSuites.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FlaskConical className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No public benchmarks yet.</p>
          {currentUser && (
            <p className="text-sm mt-1">Create the first evaluation suite.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mergedSuites.map((suite) => (
            <div
              key={suite.id}
              onClick={() => navigate(`/benchmark/${suite.id}`)}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {suite.title}
                </h3>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[suite.status]}`}>
                  {suite.status}
                </span>
              </div>
              {suite.category && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{suite.category}</p>
              )}
              {suite.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                  {suite.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span>v{suite.version}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
