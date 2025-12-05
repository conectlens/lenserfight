
import React, { useEffect, useState } from 'react';
import { LenserStats } from '../../../types/lenser.types';
import { Card } from '../../../components/Card';
import { formatCount } from '../../../utils/numberUtils';

interface LenserStatsRowProps {
  stats: LenserStats;
  joinOrder?: number;
}

const AnimatedCounter: React.FC<{ value: number; isRank?: boolean }> = ({ value, isRank }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Animation logic
    const duration = 1200; 
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(ease * value);
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {isRank ? `#${count}` : formatCount(count)}
    </span>
  );
};

export const LenserStatsRow: React.FC<LenserStatsRowProps> = ({ stats, joinOrder }) => {
  const items = [
    { label: 'Threads', value: stats.threadsCount },
    { label: 'Prompts', value: stats.promptsCount },
    { label: 'Lenser Rank', value: joinOrder || 0, isRank: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
      {items.map((item) => (
        <Card key={item.label} className="p-3 md:p-6 flex flex-col justify-center md:justify-between min-h-[80px] md:h-32 relative overflow-hidden group hover:shadow-md transition-shadow text-center md:text-left bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
           <div>
             <span className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide md:normal-case md:tracking-normal">{item.label}</span>
             <div className="mt-1 md:mt-2 text-xl md:text-3xl font-bold text-gray-900 dark:text-white leading-none">
                {item.value > 0 ? (
                    <AnimatedCounter value={item.value} isRank={item.isRank} />
                ) : (
                    <span>{item.isRank ? '-' : '0'}</span>
                )}
                <div className="hidden md:block h-1.5 w-8 bg-primary mt-2 rounded-full opacity-80"></div>
             </div>
           </div>
        </Card>
      ))}
    </div>
  );
};
