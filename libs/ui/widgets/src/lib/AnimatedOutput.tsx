import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface AnimatedOutputProps {
  content: string;
  isGenerating?: boolean;
}

export function AnimatedOutput({ content, isGenerating }: AnimatedOutputProps) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!isGenerating) {
      setDisplayed(content);
      return;
    }
    setDisplayed('');
    let i = 0;
    const t = setInterval(() => {
      setDisplayed((prev) => prev + (content[i] || ''));
      i++;
      if (i >= content.length) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [content, isGenerating]);

  const MotionDiv = motion.div as any;

  return (
    <MotionDiv 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
    >
      {displayed}
      {isGenerating && <span className="inline-block w-2 bg-black h-4 ml-1 animate-pulse" />}
    </MotionDiv>
  );
}
