'use client';

import React, { useState } from 'react';
import { X, Calendar, ClipboardList } from 'lucide-react';

interface CycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; start_date: string; end_date: string; status?: string }) => Promise<void>;
}

export function CycleModal({
  isOpen,
  onClose,
  onSubmit,
}: CycleModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Upcoming');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        title,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        status,
      });
      setTitle('');
      setStartDate('');
      setEndDate('');
      setStatus('Upcoming');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || 'Failed to create review cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-amber-500 dark:bg-amber-600 px-6 py-6 text-white shrink-0 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
          
          <h2 className="text-lg font-black tracking-tight">Create Review Cycle</h2>
          <p className="text-xs text-white/80 font-medium mt-1">
            Define a new assessment period for performance appraisals.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Cycle Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q1 2026, Annual 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Start Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                End Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer"
                  required
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Cycle Status *
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer appearance-none"
                required
              >
                <option value="Upcoming" className="bg-white dark:bg-gray-900">Upcoming</option>
                <option value="Active" className="bg-white dark:bg-gray-900">Active</option>
                <option value="Closed" className="bg-white dark:bg-gray-900">Closed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ClipboardList size={14} />
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex gap-3 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-sm font-semibold text-white transition shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
