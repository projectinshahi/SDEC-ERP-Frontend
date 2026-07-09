'use client';

import { useState, useEffect, useRef } from 'react';
import { Trophy, XCircle, X } from 'lucide-react';
import { Button } from '@/components/Button';

export type CloseReasonType = 'win' | 'loss';

interface CloseReasonModalProps {
  isOpen: boolean;
  type: CloseReasonType;
  dealTitle: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

const CONFIG = {
  win: {
    title: 'Close Deal — Won 🎉',
    description: 'Why did you win this deal? This helps the team learn from successful sales.',
    placeholder: 'e.g. Competitive pricing, strong relationship, product fit…',
    icon: Trophy,
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    buttonLabel: 'Close as Won',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  },
  loss: {
    title: 'Close Deal — Lost',
    description: 'Why was this deal lost? Tracking loss reasons helps improve future outcomes.',
    placeholder: 'e.g. Price too high, went with competitor, budget cut…',
    icon: XCircle,
    accentClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-200 dark:border-rose-800',
    buttonLabel: 'Close as Lost',
    buttonClass: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
  },
} as const;

export function CloseReasonModal({ isOpen, type, dealTitle, onSubmit, onCancel }: CloseReasonModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSubmitting(false);
      // Focus the textarea after the modal renders
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = CONFIG[type];
  const Icon = cfg.icon;
  const canSubmit = reason.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${cfg.bgClass} ${cfg.borderClass} border mb-4`}>
            <Icon size={22} className={cfg.accentClass} />
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {cfg.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Deal: <span className="font-medium text-gray-700 dark:text-gray-300">{dealTitle}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {cfg.description}
          </p>

          {/* Reason input */}
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={cfg.placeholder}
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
                handleSubmit();
              }
            }}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${cfg.buttonClass}`}
            >
              <Icon size={16} />
              {submitting ? 'Saving…' : cfg.buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
