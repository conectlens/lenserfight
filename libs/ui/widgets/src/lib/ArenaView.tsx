import React from 'react';

export interface ArenaViewProps {
  children?: React.ReactNode;
}

export function ArenaView({ children }: ArenaViewProps) {
  return (
    <div className="flex flex-col md:flex-row w-full gap-4 relative">
      {children}
    </div>
  );
}
