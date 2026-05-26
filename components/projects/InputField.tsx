'use client';

import React from 'react';
import { classNames } from '@/lib/utils';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 transition-colors duration-200"
        >
          {label} {required && <span className="text-rose-500" aria-hidden="true">*</span>}
        </label>
        <input
          id={id}
          ref={ref}
          className={classNames(
            'w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 leading-normal',
            error
              ? 'border-rose-400 dark:border-rose-800/80 focus:border-rose-500 focus:ring-rose-500/10'
              : 'border-gray-300/80 dark:border-gray-700/60 focus:border-blue-500 dark:focus:border-blue-400',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${id}-error`}
            className="text-rose-500 text-xs mt-1.5 font-medium animate-fade-in"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
