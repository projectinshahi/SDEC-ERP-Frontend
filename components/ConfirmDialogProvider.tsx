'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'danger' | 'primary' | 'secondary';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (!confirmState) return;
    confirmState.resolve(false);
    setConfirmState(null);
  }, [confirmState]);

  const handleConfirm = useCallback(() => {
    if (!confirmState) return;
    setIsProcessing(true);
    confirmState.resolve(true);
    setConfirmState(null);
    setIsProcessing(false);
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        isOpen={Boolean(confirmState)}
        onClose={handleCancel}
        title={confirmState?.title ?? 'Confirm action'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-left">
            <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{confirmState?.message}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={handleCancel} disabled={isProcessing}>
              {confirmState?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={confirmState?.intent === 'danger' ? 'danger' : 'primary'} className="flex-1" onClick={handleConfirm} isLoading={isProcessing}>
              {confirmState?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
