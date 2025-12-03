import React from 'react';
import { FEATURES } from '../../../config/runtimeConfig';

type Tab = 'prompts' | 'threads' | 'challenges';

interface LenserTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export const LenserTabs: React.FC<LenserTabsProps> = ({ activeTab, onChange }) => {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'prompts', label: 'Prompts' },
    { id: 'threads', label: 'Threads' }
  ];

  if (FEATURES.CHALLENGES_TAB) {
    tabs.push({ id: 'challenges', label: 'Challenge History' });
  }

  return (
    <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            pb-3 text-sm font-semibold transition-all relative
            ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );
};