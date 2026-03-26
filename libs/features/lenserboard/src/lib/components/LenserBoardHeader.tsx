import React from 'react'

export const LenserBoardHeader: React.FC = () => {
  return (
    <div className="mb-8 md:mb-12">
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
        LenserBoard
      </h1>
      <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
        Top Lensers by XP, Level, and Streaks
      </p>
    </div>
  )
}
