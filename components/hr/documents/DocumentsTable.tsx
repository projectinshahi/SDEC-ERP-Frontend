'use client';

import React from 'react';
import { Eye, Download, CheckCircle, XCircle, Trash2, Inbox, Calendar, AlertTriangle } from 'lucide-react';
import { HrDocument } from '@/lib/hr/documents.types';

interface DocumentsTableProps {
  records: HrDocument[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentsTable({
  records,
  onVerify,
  onReject,
  onDelete,
}: DocumentsTableProps) {
  const handleDownload = (url: string, filename: string) => {
    let downloadUrl = url;
    if (url.includes('/upload/')) {
      downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
    }
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/10">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-700 stroke-[1.5]" />
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">No documents registered</h3>
        <p className="text-xs text-gray-400 dark:text-gray-550 mt-1">Upload files or adjust filters to view records here.</p>
      </div>
    );
  }

  // Check if date is expiring within 30 days
  const getExpiryWarning = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return { warning: false, expired: false };
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    if (expiry < today) {
      return { warning: false, expired: true };
    }
    const thirtyDays = new Date();
    thirtyDays.setDate(today.getDate() + 30);
    if (expiry <= thirtyDays) {
      return { warning: true, expired: false };
    }
    return { warning: false, expired: false };
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Document Type</th>
              <th className="px-6 py-4">File Name</th>
              <th className="px-6 py-4">Upload Date</th>
              <th className="px-6 py-4">Expiry Date</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-350">
            {records.map((doc) => {
              const uploadDate = new Date(doc.createdAt).toLocaleDateString('en-GB');
              const { warning, expired } = getExpiryWarning(doc.expiryDate);
              const expiryText = doc.expiryDate 
                ? new Date(doc.expiryDate).toLocaleDateString('en-GB') 
                : 'No Expiry';

              return (
                <tr 
                  key={doc.id}
                  className="hover:bg-gray-50/40 dark:hover:bg-gray-850/20 transition-colors"
                >
                  {/* Employee Details */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-950 dark:text-white">{doc.employeeName}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 font-mono">{doc.employeeCode} • {doc.designation}</span>
                    </div>
                  </td>

                  {/* Document Type */}
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10.5px]">
                      {doc.documentType}
                    </span>
                  </td>

                  {/* File Name */}
                  <td className="px-6 py-4 max-w-[160px] truncate font-medium text-gray-600 dark:text-gray-300" title={doc.fileName}>
                    {doc.fileName}
                  </td>

                  {/* Upload Date */}
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">
                    {uploadDate}
                  </td>

                  {/* Expiry Date with highlighting */}
                  <td className="px-6 py-4 font-medium">
                    {expired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30">
                        <AlertTriangle size={11} />
                        <span>Expired ({expiryText})</span>
                      </span>
                    ) : warning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455 border border-amber-100 dark:border-amber-900/30">
                        <Calendar size={11} />
                        <span>Expiring ({expiryText})</span>
                      </span>
                    ) : (
                      <span className="text-gray-550 dark:text-gray-400">{expiryText}</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 text-center">
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        doc.status === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                          : doc.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                          : doc.status === 'Expired'
                          ? 'bg-red-950/25 text-red-500 border-red-900/40'
                          : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 shrink-0">
                      {/* View Action */}
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View document in tab"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-605 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition"
                      >
                        <Eye size={13.5} />
                      </a>

                      {/* Download Action */}
                      <button
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        title="Download document"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-605 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition"
                      >
                        <Download size={13.5} />
                      </button>

                      {/* Verify Action */}
                      {doc.rawStatus !== 'Verified' && (
                        <button
                          onClick={() => onVerify(doc.id)}
                          title="Verify document"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                        >
                          <CheckCircle size={13.5} />
                        </button>
                      )}

                      {/* Reject Action */}
                      {doc.rawStatus !== 'Rejected' && (
                        <button
                          onClick={() => onReject(doc.id)}
                          title="Reject document"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <XCircle size={13.5} />
                        </button>
                      )}

                      {/* Delete Action */}
                      <button
                        onClick={() => onDelete(doc.id)}
                        title="Delete document record"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
