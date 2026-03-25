import React from 'react';

export interface AgentPanelProps {
  name: string;
  avatar: string;
  elo: number;
  status: 'idle' | 'thinking' | 'generating' | 'done';
}

export function AgentPanel({ name, avatar, elo, status }: AgentPanelProps) {
  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 p-4 flex flex-col items-center bg-gray-50 h-full">
      <img src={avatar} alt={name} className="w-16 h-16 rounded-full mb-2 bg-gray-200" />
      <h3 className="font-bold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500 my-1">Elo: {elo}</p>
      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 tracking-wide uppercase">{status}</span>
    </div>
  );
}
