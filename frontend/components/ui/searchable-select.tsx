'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 320;
      const gap = 4;
      
      // Check if there's enough space below
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      
      // Decide whether to show dropdown above or below
      const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;
      
      const style: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
        maxHeight: `${Math.min(dropdownMaxHeight, showAbove ? spaceAbove : spaceBelow)}px`,
      };
      
      if (showAbove) {
        // Show above button
        style.bottom = `${window.innerHeight - rect.top + gap}px`;
      } else {
        // Show below button
        style.top = `${rect.bottom + gap}px`;
      }
      
      setDropdownStyle(style);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use setTimeout to prevent scroll jump
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 0);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'w-full px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-md',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'flex items-center justify-between gap-2'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-gray-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          style={dropdownStyle}
          className="bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
          onMouseDown={(e) => {
            // Prevent default to avoid focus issues
            e.preventDefault();
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((option) => {
                // Parse name and department from label (format: "Name (Department)")
                const labelParts = option.label.match(/^(.+?)\s*\((.+?)\)\s*$/);
                const name = labelParts ? labelParts[1].trim() : option.label;
                const department = labelParts ? labelParts[2].trim() : null;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors cursor-pointer',
                      'flex items-center gap-3',
                      option.value === value && 'bg-blue-50 border-l-2 border-blue-500'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      option.value === value ? 'bg-blue-100' : 'bg-gray-100'
                    )}>
                      <User className={cn(
                        'w-4 h-4',
                        option.value === value ? 'text-blue-600' : 'text-gray-600'
                      )} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name (bold) */}
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {name}
                      </div>
                      
                      {/* Department (if exists) */}
                      {department && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {department}
                        </div>
                      )}
                    </div>
                    
                    {/* Checkmark */}
                    {option.value === value && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
