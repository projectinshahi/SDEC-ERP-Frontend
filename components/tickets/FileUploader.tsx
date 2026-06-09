'use client';

import React, { useCallback, useState } from 'react';
import { UploadCloud, X, File as FileIcon, Image as ImageIcon, Plus } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface QueuedFile {
  file: File;
  description: string;
}

interface FileUploaderProps {
  files: QueuedFile[];
  onChange: (files: QueuedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function FileUploader({ files, onChange, maxFiles = 10, maxSizeMB = 10 }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedExtensions = ['.exe', '.bat', '.msi', '.sh', '.cmd', '.js', '.vbs'];

  const handleFiles = (newFiles: FileList | File[]) => {
    setError(null);
    const validFiles: QueuedFile[] = [];

    if (files.length + newFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (blockedExtensions.includes(ext)) {
        setError(`File type ${ext} is not allowed.`);
        continue;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File ${file.name} exceeds the ${maxSizeMB}MB limit.`);
        continue;
      }

      validFiles.push({ file, description: '' });
    }

    if (validFiles.length > 0) {
      onChange([...files, ...validFiles]);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [files]);

  const removeFile = (indexToRemove: number) => {
    onChange(files.filter((_, index) => index !== indexToRemove));
  };

  const updateDescription = (indexToUpdate: number, description: string) => {
    const updated = [...files];
    updated[indexToUpdate] = { ...updated[indexToUpdate], description };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {files.length === 0 && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={classNames(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors relative cursor-pointer",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
          )}
        >
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = ''; // reset so the same file can be selected again
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-2 text-gray-500 pointer-events-none">
            <UploadCloud className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-gray-400">
              Supports images, PDFs, docs up to {maxSizeMB}MB
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item, idx) => {
            const file = item.file;
            const isImage = file.type.startsWith('image/');
            const sizeKB = (file.size / 1024).toFixed(1);

            return (
              <li key={idx} className="flex flex-col space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">{sizeKB} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {isImage && (
                  <div className="pt-1 pl-13">
                    <input
                      type="text"
                      placeholder="Add a small description..."
                      className="w-full text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-gray-700 placeholder-gray-400"
                      value={item.description}
                      onChange={(e) => updateDescription(idx, e.target.value)}
                    />
                  </div>
                )}
              </li>
            );
          })}
          {files.length < maxFiles && (
            <div className="pt-2 flex">
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg cursor-pointer transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Add another file</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = ''; // reset
                  }}
                />
              </label>
            </div>
          )}
        </ul>
      )}
    </div>
  );
}
