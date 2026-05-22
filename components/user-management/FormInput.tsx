'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  id: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  showSuccess?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      id,
      type = 'text',
      placeholder,
      value,
      onChange,
      error,
      helperText,
      icon: Icon,
      required,
      disabled,
      showSuccess = false,
      className,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

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
        <div className="relative rounded-lg transition-all duration-200">
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
            type={inputType}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            className={classNames(
              'w-full py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 shadow-sm bg-white',
              Icon ? 'pl-10' : 'pl-3.5',
              isPassword ? 'pr-10' : showSuccess || error ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300'
                : showSuccess && value
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500 text-gray-900'
                : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400',
              disabled && 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed shadow-none',
              className
            )}
          />

          {/* Password Eye Toggle */}
          {isPassword && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}

          {/* Verification Indicators */}
          {!isPassword && error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500">
              <AlertCircle size={18} />
            </div>
          )}

          {!isPassword && !error && showSuccess && value && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-green-500">
              <CheckCircle size={18} />
            </div>
          )}
        </div>

        {/* Inline Feedback Messages */}
        {error ? (
          <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-slide-down">
            <AlertCircle size={12} className="inline flex-shrink-0" />
            {error}
          </p>
        ) : (
          helperText && (
            <p className="text-gray-400 text-xs font-medium pl-0.5 leading-normal">
              {helperText}
            </p>
          )
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
