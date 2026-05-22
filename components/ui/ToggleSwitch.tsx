'use client';

import React from 'react';
import { classNames } from '@/lib/utils';

interface ToggleSwitchProps {
  label: string;
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  label,
  id,
  checked,
  onChange,
  description,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  disabled = false,
}: ToggleSwitchProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={classNames(
        'flex items-center justify-between p-4 border rounded-xl transition-all duration-200 bg-white shadow-sm',
        checked ? 'border-green-200 bg-green-50/10' : 'border-gray-200 hover:border-gray-300',
        disabled && 'opacity-60 cursor-not-allowed shadow-none'
      )}
    >
      <div className="flex-1 pr-4">
        <label
          htmlFor={id}
          className={classNames(
            'text-sm font-semibold select-none cursor-pointer',
            checked ? 'text-green-800' : 'text-gray-700',
            disabled && 'cursor-not-allowed'
          )}
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-400 font-semibold mt-0.5 leading-normal select-none">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* State Label Text */}
        <span
          className={classNames(
            'text-xs font-bold transition-all duration-200 select-none uppercase tracking-wider',
            checked ? 'text-green-600' : 'text-gray-400'
          )}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>

        {/* Sliding Switch Button */}
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          onKeyDown={handleKeyDown}
          className={classNames(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
            checked
              ? 'bg-green-500 focus:ring-green-500'
              : 'bg-gray-200 focus:ring-blue-500',
            disabled && 'cursor-not-allowed bg-gray-200'
          )}
        >
          <span className="sr-only">{label}</span>
          <span
            pointer-events-none="true"
            className={classNames(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  );
}
