'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import { classNames } from '@/lib/utils';

// --- Dialog Context ---
interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType>({ open: false, setOpen: () => {} });

// --- Dialog Root ---
export function Dialog({ children, open: controlledOpen, onOpenChange }: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback((v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  }, [onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

// --- DialogTrigger ---
export function DialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(DialogContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props?.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

// --- DialogContent ---
export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(DialogContext);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={classNames(
            'relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700/80 transform transition-all animate-scale-in',
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

// --- DialogHeader ---
export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={classNames('px-6 py-5 border-b border-gray-100 dark:border-gray-700/80', className)}>
      {children}
    </div>
  );
}

// --- DialogTitle ---
export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={classNames('text-xl font-bold text-gray-900 dark:text-white tracking-tight', className)}>
      {children}
    </h2>
  );
}
