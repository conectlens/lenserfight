import React from 'react';
import { LenserStats } from '../../../types/lenser.types';
import { Card } from '../../../components/Card';
import { formatCount } from '../../../utils/numberUtils';

interface LenserStatsRowProps {
  stats: LenserStats;
}

export const LenserStatsRow: React.FC<LenserStatsRowProps> = ({ stats }) => {
  const items = [
    { label: 'Prompts', value: stats.promptsCount },
    { label: 'Threads', value: stats.threadsCount },
    { label: 'Wins', value: stats.winsCount },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {items.map((item) => (
        <Card key={item.label} className="p-6 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div>
             <span className="text-sm font-medium text-gray-500">{item.label}</span>
             <div className="mt-2 text-3xl font-bold text-gray-900 leading-none">
                {formatCount(item.value)}
                {/* Yellow underline effect */}
                <div className="h-1.5 w-8 bg-primary mt-2 rounded-full opacity-80"></div>
             </div>
           </div>
        </Card>
      ))}
    </div>
  );
};