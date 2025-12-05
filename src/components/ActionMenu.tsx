
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: ActionItem[];
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        aria-label="More options"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors
                ${action.variant === 'danger' 
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              {action.icon && <span className="opacity-70">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
