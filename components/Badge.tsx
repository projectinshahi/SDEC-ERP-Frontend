'use client';

import React from 'react';
import { classNames } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Badge component for status indicators
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className }, ref) => {
    const variantStyles = {
      default: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-700',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-800',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500',
    };

    return (
      <span
        ref={ref}
        className={classNames(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          variantStyles[variant],
          className
        )}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
