'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  id: string;
  options: (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      id,
      options,
      value,
      onChange,
      error,
      placeholder = 'Select an option',
      icon: Icon,
      required,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const formattedOptions: SelectOption[] = options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });

    return (
      <div className="space-y-1.5 w-full">
        {/* Label */}
        <div className="flex justify-between items-center">
          <label
            htmlFor={id}
            className={classNames(
              'block text-sm font-semibold transition-colors duration-150',
              error ? 'text-red-500' : isFocused ? 'text-blue-600' : 'text-gray-700'
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
        </div>

        {/* Select Wrapper */}
        <div className="relative rounded-xl shadow-sm transition-all duration-200">
          {/* Prefix Icon */}
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon
                className={classNames(
                  'transition-colors duration-200',
                  error ? 'text-red-400' : isFocused ? 'text-blue-500' : 'text-gray-400'
                )}
                size={18}
              />
            </div>
          )}

          {/* Actual Select Dropdown */}
          <select
            {...props}
            ref={ref}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            className={classNames(
              'w-full py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 bg-white appearance-none cursor-pointer pr-10',
              Icon ? 'pl-10' : 'pl-3.5',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 ring-red-500/20'
                : isFocused
                ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500 text-gray-900 ring-blue-500/20'
                : 'border-gray-200 hover:border-gray-300 text-gray-900',
              disabled && 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed shadow-none',
              className
            )}
          >
            <option value="" disabled className="text-gray-400">
              {placeholder}
            </option>
            {formattedOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-gray-900">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom Chevron Indicator */}
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            {error ? (
              <AlertCircle size={18} className="text-red-500" />
            ) : (
              <ChevronDown size={18} className={classNames('transition-transform duration-200', isFocused && 'text-blue-500 transform rotate-180')} />
            )}
          </div>
        </div>

        {/* Inline Feedback Messages */}
        {error && (
          <p
            id={`${id}-error`}
            className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-slide-down"
            role="alert"
          >
            <AlertCircle size={12} className="inline flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
