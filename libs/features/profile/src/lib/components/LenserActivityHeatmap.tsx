import { LenserActivityPoint } from '@lenserfight/types'
import { Card, HelpButton } from '@lenserfight/ui/components'
import React from 'react'


interface LenserActivityHeatmapProps {
  data: LenserActivityPoint[]
}

export const LenserActivityHeatmap: React.FC<LenserActivityHeatmapProps> = ({ data }) => {
  const currentYear = new Date().getFullYear()
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-700/50'
    if (count <= 2) return 'bg-yellow-100 dark:bg-yellow-900/30'
    if (count <= 5) return 'bg-yellow-300 dark:bg-yellow-600'
    return 'bg-yellow-400 dark:bg-yellow-500'
  }

  const sortedData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-365)

  return (
    <Card className="p-6 mb-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lenser Activity</h3>
          <HelpButton path="/explanation/lensers/lenser-activity" label="How this works" />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 flex items-center gap-2">
          {currentYear} <span className="text-xs">▼</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          <div className="flex text-xs text-gray-400 dark:text-gray-500 mb-2 pl-8">
            {months.map((m) => (
              <span key={m} className="flex-1">
                {m}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[10px] text-gray-400 dark:text-gray-500 py-1 h-[100px] w-6">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="flex-1 flex gap-1 h-[108px] flex-wrap flex-col content-start">
              {sortedData.map((point) => (
                <div
                  key={point.date}
                  className={`w-3 h-3 rounded-sm ${getColor(point.count)}`}
                  title={`${point.date}: ${point.count} contributions`}
                ></div>
              ))}
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Less</span>
            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700/50 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-300 dark:bg-yellow-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-400 dark:bg-yellow-500 rounded-sm"></div>
            <span>More</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
