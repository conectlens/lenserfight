import React from 'react';

export interface LenserPanelProps {
  name: string;
  avatar: string;
  reputation: number;
  activity: string;
}

export function LenserPanel({ name, avatar, reputation, activity }: LenserPanelProps) {
  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 p-4 flex flex-col items-center bg-gray-50 h-full">
      <img src={avatar} alt={name} className="w-16 h-16 rounded-lg mb-2 bg-gray-200" />
      <h3 className="font-bold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500 my-1">Reputation: {reputation}</p>
      <p className="text-sm text-gray-400 mt-2 text-center italic">Activity: {activity}</p>
    </div>
  );
}
