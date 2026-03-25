import React from 'react';
import { motion } from 'framer-motion';

export interface ScoreBarProps {
  scoreA: number;
  scoreB: number;
  labelA?: string;
  labelB?: string;
}

export function ScoreBar({ scoreA, scoreB, labelA = "Agent", labelB = "Lenser" }: ScoreBarProps) {
  const MotionDiv = motion.div as any;
  const total = scoreA + scoreB || 1;
  const pctA = (scoreA / total) * 100;
  return (
    <div className="w-full max-w-xl mx-auto my-4 text-sm font-bold flex flex-col relative rounded overflow-hidden">
      <div className="flex justify-between px-2 pb-1 z-10 relative text-gray-800">
         <span>{labelA}: {scoreA}</span>
         <span>{labelB}: {scoreB}</span>
      </div>
      <div className="h-4 bg-gray-200 flex w-full relative">
        <MotionDiv 
          className="h-full bg-blue-500" 
          initial={{ width: '50%' }} 
          animate={{ width: `${pctA}%` }} 
          transition={{ duration: 0.8, ease: "easeOut" }} 
        />
        <MotionDiv 
          className="h-full bg-orange-400 flex-1" 
        />
      </div>
    </div>
  );
}
