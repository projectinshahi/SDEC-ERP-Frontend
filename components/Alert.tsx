'use client';

import React, { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface AlertProps {
  children: ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Alert component for displaying messages
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'info', title, onClose, className }, ref) => {
    const variantStyles = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };

    const titleStyles = {
      success: 'text-green-900 dark:text-green-100',
      error: 'text-red-900 dark:text-red-100',
      warning: 'text-yellow-900 dark:text-yellow-100',
      info: 'text-blue-900 dark:text-blue-100',
    };

    return (
      <div
        ref={ref}
        className={classNames(
          'border rounded-lg p-4 flex gap-3',
          variantStyles[variant],
          className
        )}
        role="alert"
      >
        <div className="flex-1">
          {title && <h3 className={classNames('font-semibold mb-1', titleStyles[variant])}>{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-lg font-bold opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
