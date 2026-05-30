'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastVariant = 'success') => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 10);

    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            role="alert"
            className={classNames(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl transition transform bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
              toastItem.type === 'success' && 'border-green-200 dark:border-green-800',
              toastItem.type === 'error' && 'border-red-200 dark:border-red-800',
              toastItem.type === 'warning' && 'border-amber-200 dark:border-amber-800',
              toastItem.type === 'info' && 'border-blue-200 dark:border-blue-800'
            )}
          >
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              {toastItem.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
              {toastItem.type === 'error' ? <AlertTriangle className="h-4 w-4 text-red-600" /> : null}
              {toastItem.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
              {toastItem.type === 'info' ? <Info className="h-4 w-4 text-sky-600" /> : null}
            </span>
            <div className="flex-1 text-sm font-medium leading-snug text-gray-700 dark:text-gray-100">
              {toastItem.message}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toastItem.id))}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
