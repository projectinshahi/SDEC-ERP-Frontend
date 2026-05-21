'use client';

import React, { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outlined';
  hoverable?: boolean;
}

/**
 * Reusable Card component for displaying content
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default', hoverable = false }, ref) => {
    const baseStyles = 'rounded-lg transition-all duration-200';

    const variantStyles = {
      default: 'bg-white dark:bg-gray-800 shadow-md',
      outlined: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    };

    return (
      <div
        ref={ref}
        className={classNames(
          baseStyles,
          variantStyles[variant],
          hoverable && 'hover:shadow-lg cursor-pointer',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={classNames('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={classNames('px-6 py-4', className)}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={classNames('px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg', className)}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
