'use client';

import React, { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useOptionalConfirm } from '@/components/confirm-context';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * While true the modal refuses every dismissal route (Escape, backdrop, ✕).
   * Used to hold a confirmation open while its action is still in flight so the
   * user cannot fire a second one or lose the result of the first.
   */
  busy?: boolean;
  /** id of the element describing this dialog, for screen readers. */
  describedBy?: string;
  /**
   * Lifts the dialog above every other overlay in the app. Several modals and
   * viewers are stacked at z-[60]/z-[100]/z-[9999], so a plain z-50 confirmation
   * opened from inside one of them rendered *behind* it. Stays under the toast
   * layer (z-[9999]) so results are still visible.
   */
  elevated?: boolean;
  /**
   * Ask before discarding typed input when the user dismisses the modal by
   * Escape or a backdrop click. Opt-in: a stray click outside a half-filled
   * create/edit form used to throw the work away silently, but prompting on a
   * read-only or search-only modal would be noise.
   *
   * Dismissal triggered by the form's own Save path calls `onClose()` directly
   * and is never intercepted.
   */
  confirmDiscard?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modals stack — a confirmation can open on top of a form modal. Releasing the
 * body scroll lock unconditionally on close therefore unlocked the page while
 * the modal underneath was still open, so the depth is counted instead.
 */
let openModals = 0;

/**
 * Reusable Modal component
 */
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, children, size = 'md', busy = false, describedBy, elevated = false, confirmDiscard = false }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const confirmCtx = useOptionalConfirm();

    /* "Dirty" means the USER changed something. React repopulating an edit form
       writes `.value` directly, which fires no input/change event — so an async
       hydrate can never be mistaken for typing the way a value snapshot would. */
    const touchedRef = useRef(false);

    /* Read through refs so the effect can depend on `isOpen` alone. Callers
       routinely pass an inline `onClose`, and re-running on every render would
       yank focus back to the top of the dialog mid-typing. */
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const busyRef = useRef(busy);
    busyRef.current = busy;
    // Escape is handled by a document listener, so it needs the latest closure.
    const dismissRef = useRef<() => void | Promise<void>>(() => {});

    useEffect(() => {
      if (!isOpen) return;

      openModals += 1;
      /* Only the top-most dialog reacts to the keyboard. Without this a stacked
         confirmation and the form modal underneath both saw the same Escape —
         closing two dialogs on one keypress, and fighting over the Tab trap. */
      const myDepth = openModals;
      document.body.style.overflow = 'hidden';
      touchedRef.current = false;

      const markTouched = () => { touchedRef.current = true; };
      const root = rootRef.current;
      root?.addEventListener('input', markTouched);
      root?.addEventListener('change', markTouched);

      const restoreTo = document.activeElement as HTMLElement | null;
      const focusable = () =>
        Array.from(rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
          .filter((el) => el.offsetParent !== null);

      // `data-autofocus` lets a dialog nominate its safe default (Cancel, say)
      // instead of landing on whatever happens to come first in the DOM.
      (rootRef.current?.querySelector<HTMLElement>('[data-autofocus]')
        ?? focusable()[0]
        ?? rootRef.current)?.focus();

      const onKeyDown = (e: KeyboardEvent) => {
        if (openModals !== myDepth) return;
        if (e.key === 'Escape') {
          if (!busyRef.current) void dismissRef.current();
          return;
        }
        if (e.key !== 'Tab') return;
        const list = focusable();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!rootRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      };

      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        root?.removeEventListener('input', markTouched);
        root?.removeEventListener('change', markTouched);
        openModals -= 1;
        if (openModals === 0) document.body.style.overflow = '';
        restoreTo?.focus?.();
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
    };

    const dismiss = async () => {
      if (busy) return;
      if (confirmDiscard && touchedRef.current && confirmCtx) {
        const discard = await confirmCtx.confirm({
          title: 'Discard unsaved changes?',
          message: 'You have unsaved changes on this form. Closing now loses them.',
          confirmLabel: 'Discard',
          cancelLabel: 'Stay',
          intent: 'danger',
        });
        if (!discard) return;
      }
      onClose();
    };
    dismissRef.current = dismiss;

    return (
      <div className={classNames('fixed inset-0 overflow-y-auto', elevated ? 'z-[9998]' : 'z-50')} ref={rootRef} tabIndex={-1}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
          onClick={() => void dismiss()}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={ref}
            className={classNames(
              'relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700/80 transform transition-all animate-scale-in',
              sizeClasses[size]
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={describedBy}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700/80">
              <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <button
                onClick={() => void dismiss()}
                disabled={busy}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';
