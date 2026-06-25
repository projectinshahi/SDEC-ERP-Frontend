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
    const baseStyles = 'rounded-2xl transition-all duration-300 ease-in-out';

    const variantStyles = {
   default: 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none',
      outlined: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
    };

    return (
      <div
        ref={ref}
        className={classNames(
          baseStyles,
          variantStyles[variant],
          hoverable && 'hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer',
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
    <div ref={ref} className={classNames('px-6 py-5 border-b border-gray-100 dark:border-gray-800/60', className)}>
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
    <div ref={ref} className={classNames('px-6 py-4 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30 rounded-b-2xl', className)}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
