'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, AlertCircle, FileText } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';
import { uploadDocumentFile, SaveDocumentPayload } from '@/lib/api/hr-documents';
import { HR_DOCUMENT_TYPES } from '@/lib/hr/documents.types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ApiEmployee[];
  onSave: (payload: SaveDocumentPayload) => Promise<void>;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  employees,
  onSave,
}: DocumentUploadModalProps) {
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState('Identity Proof');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(employees[0]?.id ?? '');
      setDocumentType('Identity Proof');
      setExpiryDate('');
      setNotes('');
      setFileUrl('');
      setFileName('');
      setErrorMsg(null);
    }
  }, [isOpen, employees]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format validation
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowed.includes(ext)) {
      setErrorMsg('Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }

    // Size check
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await uploadDocumentFile(file);
      if (res.success) {
        setFileUrl(res.url);
        setFileName(res.fileName);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to upload document file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setErrorMsg('Please select an employee.');
      return;
    }
    if (!fileUrl) {
      setErrorMsg('Please upload a document file.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: SaveDocumentPayload = {
        employee_id: Number(employeeId),
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        notes: notes || null,
      };
      await onSave(payload);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to save document record.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-850 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-gray-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500">
              <Upload size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Upload Employee Document</h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Verify credentials and upload record documents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-250 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Employee *</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(Number(e.target.value))}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer transition"
            >
              <option value="" disabled>— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.name} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Document Type *</label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer transition"
            >
              {HR_DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Document File *</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 transition"
              >
                {isUploading ? (
                  <Loader2 size={15} className="animate-spin text-blue-500" />
                ) : (
                  <Upload size={15} />
                )}
                <span>Choose File</span>
              </button>

              {fileName && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold max-w-[200px] truncate border border-emerald-100 dark:border-emerald-900/30">
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Supported formats: PDF, JPG, PNG. Max file size: 5MB.
            </p>
          </div>

          {/* Expiry Date (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
            />
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes / Comments</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Identity proof verified with physical PAN card copy..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-850 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-850 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
            >
              {isSaving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                'Upload Document'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
