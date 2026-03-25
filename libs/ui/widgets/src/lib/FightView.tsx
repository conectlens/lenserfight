import React from 'react';

export interface FightViewProps {
  children?: React.ReactNode;
}

export function FightView({ children }: FightViewProps) {
  return (
    <div className="flex-1 min-h-[400px] border border-gray-200 rounded-lg shadow-sm p-4 relative overflow-hidden bg-white">
      {children}
    </div>
  );
}
