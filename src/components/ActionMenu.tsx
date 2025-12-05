
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
        if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, { capture: true });
        window.addEventListener('resize', handleScroll);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, { capture: true });
        window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          // Align right edge of dropdown (w-48 = 192px) with right edge of button
          const dropdownWidth = 192; 
          // Use fixed positioning relative to viewport
          const left = rect.right - dropdownWidth;
          const top = rect.bottom + 8; // slight gap
          
          setPosition({ top, left });
      }
      setIsOpen(!isOpen);
  };

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        aria-label="More options"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && createPortal(
        <div 
            ref={dropdownRef}
            className="fixed w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-[9999] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
            style={{ 
                top: position.top, 
                left: position.left 
            }}
            onClick={(e) => e.stopPropagation()}
        >
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
        </div>,
        document.body
      )}
    </>
  );
};
