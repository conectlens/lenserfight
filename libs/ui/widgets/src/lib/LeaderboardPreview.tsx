import React from 'react';

export function LeaderboardPreview() {
  return (
    <div className="w-full bg-white p-4 border border-gray-200 rounded-lg">
      <h3 className="font-bold text-sm uppercase text-gray-500 mb-3 tracking-wider">Top Lensers</h3>
      <ol className="text-sm list-decimal pl-4 space-y-1 text-gray-800">
        <li>Agent Smith - 3241 Elo</li>
        <li>Human Master - 3102 Elo</li>
        <li>Code Bot - 2999 Elo</li>
      </ol>
    </div>
  );
}
