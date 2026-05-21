'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown, ShieldAlert } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select roles...',
  error,
  required,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleOption = (option: string) => {
    const isSelected = selected.includes(option);
    if (isSelected) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleRemoveItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== item));
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5 w-full relative" ref={containerRef}>
      {/* Label */}
      <label className={classNames(
        'block text-sm font-semibold transition-colors duration-150',
        error ? 'text-red-500' : isOpen ? 'text-blue-600' : 'text-gray-700'
      )}>
        {label}
        {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>

      {/* Main Trigger Selector */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'w-full min-h-[42px] px-3 py-2 flex items-center justify-between border rounded-lg cursor-pointer transition-all duration-200 shadow-sm bg-white',
          error
            ? 'border-red-300 ring-2 ring-red-500/10 focus-within:border-red-500'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/10'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="flex flex-wrap gap-1.5 items-center pr-2">
          {selected.length === 0 ? (
            <span className="text-gray-400 text-sm font-medium">{placeholder}</span>
          ) : (
            selected.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 transition-all duration-200 hover:bg-blue-100 hover:scale-[1.03]"
              >
                {role}
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(role, e)}
                  className="p-0.5 rounded-full hover:bg-blue-200/50 text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className={classNames(
            'text-gray-400 transition-transform duration-200 flex-shrink-0',
            isOpen && 'transform rotate-180 text-blue-500'
          )}
        />
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute z-30 w-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-scale-in">
          {/* Search Input inside Dropdown */}
          <div className="px-3 py-2.5 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles..."
              className="w-full text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-medium"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options Items */}
          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 font-medium flex flex-col items-center gap-1">
                <ShieldAlert size={18} />
                <span>No roles found matching "{search}"</span>
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <label
                    key={option}
                    className={classNames(
                      'flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-sm font-medium transition-colors hover:bg-gray-50/70',
                      isSelected && 'bg-blue-50/20 text-blue-600'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOption(option);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled via label onClick
                        className="w-4 h-4 text-blue-600 border-gray-200 rounded focus:ring-blue-500/20 focus:ring-2 cursor-pointer transition-all"
                      />
                      <span className={classNames('text-gray-700 font-semibold text-xs', isSelected && 'text-blue-600')}>{option}</span>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-blue-600" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-slide-down">
          <ShieldAlert size={12} className="inline flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
