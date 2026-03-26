import React from 'react'

import { LeaderboardEntry } from '@lenserfight/types'

import { LenserBoardRow } from './LenserBoardRow'

interface MyPositionStripProps {
  entry: LeaderboardEntry
}

export const MyPositionStrip: React.FC<MyPositionStripProps> = ({ entry }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-20 px-4 md:hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-7xl mx-auto shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        <LenserBoardRow mode="xp" entry={entry} isCurrentUser={true} />
      </div>
    </div>
  )
}
