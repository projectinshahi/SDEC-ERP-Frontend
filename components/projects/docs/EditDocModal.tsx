'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { ProjectDocument } from '@/lib/api/project_documents';

interface EditDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProjectDocument | null;
  onUpdate: (documentId: number, title: string, description: string) => Promise<void>;
  isUpdating: boolean;
}

export function EditDocModal({ isOpen, onClose, document, onUpdate, isUpdating }: EditDocModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document && isOpen) {
      setTitle(document.title);
      setDescription(document.description || '');
      setError(null);
    }
  }, [document, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    
    if (!title.trim()) {
      setError('Please provide a title.');
      return;
    }

    try {
      await onUpdate(document.id, title, description);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document metadata');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Document Metadata" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Document Title"
          id="edit-doc-title"
          value={title}
          onChange={setTitle}
          required
        />

        <TextareaField
          label="Description"
          id="edit-doc-description"
          value={description}
          onChange={setDescription}
          rows={3}
        />

        {error && (
          <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isUpdating} disabled={!title.trim() || !document}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
