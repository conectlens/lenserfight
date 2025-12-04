import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  dropdownClassName?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  error,
  disabled,
  className = '',
  required,
  dropdownClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Portal positioning
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(o => o.value === value);

  // Close on outside click and scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check trigger button click
      if (containerRef.current && containerRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Check dropdown content click (if handling clicks inside without closing immediately for some reason)
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };
    
    // Close on scroll/resize to avoid detachment of fixed/absolute portal, 
    // BUT ignore scrolls happening INSIDE the dropdown itself.
    const handleScrollOrResize = (e: Event) => {
        if (!isOpen) return;

        // If the event target is the dropdown or inside it, ignore the scroll event
        // Note: e.target usually refers to the element being scrolled.
        // We check if that element is contained within our dropdown ref.
        const target = e.target as Node;
        if (dropdownRef.current && target && (dropdownRef.current === target || dropdownRef.current.contains(target))) {
            return;
        }

        setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        // Use capture to catch scrolling of parents
        window.addEventListener('scroll', handleScrollOrResize, { capture: true });
        window.addEventListener('resize', handleScrollOrResize);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
        window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const toggleOpen = () => {
      if (disabled) return;
      
      if (!isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setCoords({
              top: rect.bottom + window.scrollY + 4, // 4px gap
              left: rect.left + window.scrollX,
              width: rect.width
          });
      }
      setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    if (val !== value) {
        onChange(val);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
       e.preventDefault();
       toggleOpen();
    }
    if (e.key === 'Escape') {
        setIsOpen(false);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        ref={containerRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`
            w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white text-left transition-all shadow-sm
            ${error 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-200 hover:border-gray-300 focus:ring-primary/50 focus:border-primary'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-70' : 'cursor-pointer focus:ring-2'}
        `}
      >
        <span className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
            {selectedOption?.icon && <selectedOption.icon size={16} className="text-gray-500" />}
            <span className="text-sm font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && createPortal(
        <div 
            ref={dropdownRef}
            className={`select-dropdown-portal absolute z-[9999] bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top ${dropdownClassName}`}
            style={{ 
                top: coords.top, 
                left: coords.left, 
                width: coords.width 
            }}
        >
            <div className="p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                            ${option.value === value 
                                ? 'bg-primary/10 text-gray-900 font-semibold' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}
                        `}
                    >
                        <div className="flex items-center gap-2.5">
                            {option.icon && <option.icon size={16} className={option.value === value ? 'text-gray-900' : 'text-gray-400'} />}
                            {option.label}
                        </div>
                        {option.value === value && <Check size={14} className="text-primary-700" />}
                    </button>
                ))}
                {options.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">No options available</div>
                )}
            </div>
        </div>,
        document.body
      )}
      
      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};