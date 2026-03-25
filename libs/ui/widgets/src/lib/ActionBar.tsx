import React from 'react';

export interface ActionBarProps {
  onRun?: () => void;
  onVote?: () => void;
  onFork?: () => void;
  onChallenge?: () => void;
  disabled?: boolean;
}

export function ActionBar({ onRun, onVote, onFork, onChallenge, disabled }: ActionBarProps) {
  return (
    <div className="flex gap-2 p-4 bg-gray-100 border-t border-gray-200 justify-center w-full">
      {onRun && <button disabled={disabled} onClick={onRun} className="px-4 py-2 bg-black text-white rounded font-medium disabled:opacity-50">Run Fight</button>}
      {onVote && <button disabled={disabled} onClick={onVote} className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">Vote</button>}
      {onFork && <button disabled={disabled} onClick={onFork} className="px-4 py-2 bg-gray-200 text-black rounded font-medium disabled:opacity-50">Fork</button>}
      {onChallenge && <button disabled={disabled} onClick={onChallenge} className="px-4 py-2 border border-gray-300 rounded font-medium disabled:opacity-50">Challenge</button>}
    </div>
  );
}
