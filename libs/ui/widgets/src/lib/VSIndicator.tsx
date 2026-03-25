import React from 'react';
import { motion } from 'framer-motion';

export function VSIndicator() {
  const MotionDiv = motion.div as any;
  return (
    <MotionDiv 
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 12 }}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 
                 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center 
                 font-black text-lg border-4 border-white shadow-lg shadow-black/20"
    >
      VS
    </MotionDiv>
  );
}
