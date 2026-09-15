'use client';

import { createContext, useContext } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The confirmation context lives in its own module so `Modal` can reach the
 * dialog without importing `ConfirmDialogProvider`, which renders a `Modal` —
 * importing each other directly would be a cycle.
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Extra consequence text rendered under the message. */
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'danger' | 'primary' | 'secondary';
  icon?: LucideIcon;
  /**
   * The action itself. When supplied the dialog owns the whole async lifecycle:
   * it stays open with the confirm button in a loading state, closes only once
   * the action resolves, and renders a failure inline instead of closing — so a
   * failed action can never look like it succeeded.
   *
   * Omit it for callers that run (and report on) their own mutation; `confirm()`
   * then just resolves `true` and closes, which is the older call style.
   */
  onConfirm?: () => unknown | Promise<unknown>;
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

/** For shared primitives that must still render outside the provider. */
export function useOptionalConfirm(): ConfirmContextValue | undefined {
  return useContext(ConfirmContext);
}
