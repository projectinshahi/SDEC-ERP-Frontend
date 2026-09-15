'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { AlertTriangle } from 'lucide-react';
import { ConfirmContext, type ConfirmOptions } from '@/components/confirm-context';

export { useConfirm, type ConfirmOptions } from '@/components/confirm-context';

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const errorMessage = (err: unknown): string => {
  const e = err as {
    details?: { error?: string };
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  } | null;
  return (
    e?.details?.error ||
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    'Something went wrong. Please try again.'
  );
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The live request is mirrored in refs so a second click landing in the same
     tick as the first sees the busy flag — `isProcessing` would still read
     stale from the closure and fire the action twice. */
  const stateRef = useRef<ConfirmState | null>(null);
  const busyRef = useRef(false);

  const settle = useCallback((value: boolean) => {
    stateRef.current?.resolve(value);
    stateRef.current = null;
    busyRef.current = false;
    setState(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Never orphan a caller still awaiting an earlier dialog, and never carry
      // the previous action's message or error into this one.
      stateRef.current?.resolve(false);
      const next: ConfirmState = { ...options, resolve };
      stateRef.current = next;
      busyRef.current = false;
      setState(next);
      setIsProcessing(false);
      setError(null);
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (busyRef.current) return;   // the action is in flight; cancelling now would lie
    settle(false);
  }, [settle]);

  const handleConfirm = useCallback(async () => {
    const current = stateRef.current;
    if (!current || busyRef.current) return;

    if (!current.onConfirm) {
      settle(true);
      return;
    }

    busyRef.current = true;
    setIsProcessing(true);
    setError(null);
    try {
      await current.onConfirm();
      settle(true);
    } catch (err) {
      // Stay open, stay usable, show the real reason. No success is reported.
      busyRef.current = false;
      setIsProcessing(false);
      setError(errorMessage(err));
    }
  }, [settle]);

  const danger = state?.intent === 'danger';
  const Icon = state?.icon ?? AlertTriangle;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        isOpen={Boolean(state)}
        onClose={handleCancel}
        busy={isProcessing}
        title={state?.title ?? 'Confirm action'}
        describedBy="confirm-dialog-message"
        elevated
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-left">
            <div
              className={
                danger
                  ? 'mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                  : 'mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
              }
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p id="confirm-dialog-message" className="text-sm text-gray-700 dark:text-gray-200 break-words">
                {state?.message}
              </p>
              {state?.warning && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 break-words">
                  {state.warning}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleCancel}
              disabled={isProcessing}
              data-autofocus
            >
              {state?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              className="flex-1"
              onClick={handleConfirm}
              isLoading={isProcessing}
            >
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
