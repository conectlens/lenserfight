import React from 'react';

export interface ArenaViewProps {
  title?: string;
  slotA?: React.ReactNode;
  slotB?: React.ReactNode;
  center?: React.ReactNode;
}

export function ArenaView({ title, slotA, slotB, center }: ArenaViewProps) {
  return (
    <div className="flex flex-col gap-4 w-full min-h-[400px] bg-gray-50 border border-gray-200 rounded-xl p-4">
      {title && <h2 className="text-lg font-bold text-gray-900 text-center">{title}</h2>}
      <div className="flex flex-1 gap-4 items-stretch">
        <div className="flex-1">{slotA}</div>
        {center && <div className="flex items-center justify-center">{center}</div>}
        <div className="flex-1">{slotB}</div>
      </div>
    </div>
  );
}
