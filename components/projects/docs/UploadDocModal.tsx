'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { UploadCloud, File, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface UploadDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, title: string, description: string) => Promise<void>;
  isUploading: boolean;
}

export function UploadDocModal({ isOpen, onClose, onUpload, isUploading }: UploadDocModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blockedExtensions = ['.exe', '.bat', '.msi', '.sh', '.cmd', '.js', '.vbs'];
  const maxSizeMB = 50;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (blockedExtensions.includes(ext)) {
      setError(`File type ${ext} is not allowed.`);
      return;
    }

    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds the ${maxSizeMB}MB limit.`);
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title.');
      return;
    }

    try {
      await onUpload(file, title, description);
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={classNames(
              'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-3">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1 text-center">
              PDF, DOCX, XLSX, PPTX, Images, ZIP (max {maxSizeMB}MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-md text-blue-600 dark:text-blue-300 shrink-0">
                <File size={16} />
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <InputField
          label="Document Title"
          id="upload-doc-title"
          value={title}
          onChange={setTitle}
          placeholder="e.g., API Specifications v2"
          required
        />

        <TextareaField
          label="Description (Optional)"
          id="upload-doc-description"
          value={description}
          onChange={setDescription}
          placeholder="Briefly describe what this document contains..."
          rows={3}
        />

        {error && (
          <div className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isUploading} disabled={!file || !title.trim()}>
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
