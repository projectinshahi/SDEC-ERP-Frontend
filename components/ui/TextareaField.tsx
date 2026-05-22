'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface TextareaFieldProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  id: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      id,
      placeholder,
      value = '',
      onChange,
      error,
      required,
      disabled,
      rows = 3,
      maxLength,
      showCharCount = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const valueString = String(value);

    return (
      <div className="space-y-1.5 w-full">
        {/* Label and Count */}
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

          {showCharCount && maxLength && (
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {valueString.length}/{maxLength} chars
            </span>
          )}
        </div>

        {/* Input Wrapper */}
        <div className="relative rounded-xl shadow-sm transition-all duration-200">
          <textarea
            {...props}
            ref={ref}
            id={id}
            rows={rows}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            className={classNames(
              'w-full py-2.5 px-3.5 rounded-xl border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 bg-white resize-none',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300 ring-red-500/20'
                : isFocused
                ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500 text-gray-900 ring-blue-500/20'
                : 'border-gray-200 hover:border-gray-300 text-gray-900 placeholder-gray-400',
              disabled && 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed shadow-none',
              className
            )}
          />
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

TextareaField.displayName = 'TextareaField';
