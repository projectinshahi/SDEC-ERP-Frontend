'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { createBoardApi } from '@/lib/api/kanban';
import { useProject } from '@/lib/context/ProjectContext';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBoardId: number) => void;
}

export function CreateBoardModal({ isOpen, onClose, onSuccess }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{name?: string, projectId?: string}>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { activeProject } = useProject();

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      // Auto-focus after a short delay for transition
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } else {
      // Reset state when closed
      setName('');
      setError(null);
      setSuccess(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  // Handle ESC key and Outside Click
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const errors: {name?: string, projectId?: string} = {};
    if (!name.trim()) errors.name = 'Board name is required';
    if (!activeProject) errors.projectId = 'No active project selected';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createBoardApi({ name, projectId: activeProject!.id });
      setSuccess('Board created successfully!');
      
      // Delay closing to show success toast
      setTimeout(() => {
        onSuccess(res.id);
        onClose();
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create board');
      setIsSubmitting(false); // Only re-enable on error, on success we wait to close
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOutsideClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-800 dark:text-gray-100">Create New Board</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto">
          {/* Global Feedback */}
          {error && (
            <div className="mb-5 p-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3 flex items-start gap-2 text-sm text-green-600 bg-green-50 rounded-lg border border-green-100 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Board Name */}
            <div>
              <label htmlFor="boardName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Board Name <span className="text-red-500">*</span>
              </label>
              <input
                id="boardName"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors({...validationErrors, name: undefined});
                }}
                placeholder="Enter board name"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  ${validationErrors.name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'}
                  aria-invalid={!!validationErrors.name}`}
              />
              {validationErrors.name && (
                <p className="mt-1.5 text-sm text-red-500 animate-in slide-in-from-top-1">{validationErrors.name}</p>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3 justify-end mt-auto rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || !!success}
            className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !!success}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {success ? 'Success!' : isSubmitting ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
