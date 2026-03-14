import { RefreshCcw } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Card } from '@lenserfight/ui/components'
import { adminService } from '@lenserfight/data/repositories'
import { AdminAnalyticsData } from '@lenserfight/types'
import { AreaChart, BarChart } from '../components/AdminCharts'

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminService.getDashboardStats()
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) return <div>Error loading data.</div>

  const mapChartData = (series: { date: string; count: number }[]) =>
    series.map((s) => ({
      label: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: s.count,
    }))

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Page Views - Area Chart */}
      <Card className="p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Page Views</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Traffic trends over the last 30 days
          </p>
        </div>
        <div className="h-64">
          <AreaChart
            data={mapChartData(data.pageViews)}
            color="#f59e0b" // Amber/Primary
            height={250}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registrations - Bar Chart */}
        <Card className="p-6 md:p-8">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Users</h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              + {data.registrations.reduce((a, b) => a + b.count, 0)} Total
            </span>
          </div>
          <div className="h-48">
            <BarChart
              data={mapChartData(data.registrations)}
              color="#6366f1" // Indigo
              height={192}
            />
          </div>
        </Card>

        {/* Threads - Bar Chart */}
        <Card className="p-6 md:p-8">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Threads Created</h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Active Community
            </span>
          </div>
          <div className="h-48">
            <BarChart
              data={mapChartData(data.threads)}
              color="#10b981" // Emerald
              height={192}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
