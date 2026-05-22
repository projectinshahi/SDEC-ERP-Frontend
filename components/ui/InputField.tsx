'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  id: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  showSuccess?: boolean;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      id,
      type = 'text',
      placeholder,
      value,
      onChange,
      error,
      icon: Icon,
      required,
      disabled,
      showSuccess = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

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

        {/* Input Wrapper */}
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

          {/* Actual Input */}
          <input
            {...props}
            ref={ref}
            type={type}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            className={classNames(
              'w-full py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 bg-white',
              Icon ? 'pl-10' : 'pl-3.5',
              showSuccess || error ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300 ring-red-500/20'
                : isFocused
                ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500 text-gray-900 ring-blue-500/20'
                : 'border-gray-200 hover:border-gray-300 text-gray-900 placeholder-gray-400',
              disabled && 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed shadow-none',
              className
            )}
          />

          {/* Verification Indicators */}
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-red-500">
              <AlertCircle size={18} />
            </div>
          )}

          {!error && showSuccess && value && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-green-500">
              <CheckCircle size={18} />
            </div>
          )}
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

InputField.displayName = 'InputField';
