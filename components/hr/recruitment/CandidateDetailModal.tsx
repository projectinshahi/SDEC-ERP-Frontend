'use client';

import React from 'react';
import { X, Mail, Phone, Briefcase, DollarSign, Award, Download, Clipboard, Link, FileText, ArrowUpRight } from 'lucide-react';
import { Candidate } from '@/lib/hr/recruitment.types';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export function CandidateDetailModal({
  isOpen,
  onClose,
  candidate,
}: CandidateDetailModalProps) {
  if (!isOpen || !candidate) return null;

  const detailRows = [
    { label: 'Position', value: candidate.role, icon: Briefcase },
    { label: 'Department', value: candidate.department || 'Not Specified', icon: Briefcase },
    { label: 'Experience', value: candidate.experience || 'Not Specified', icon: Award },
    { label: 'Expected CTC', value: candidate.expectedCtc ? `₹${Number(candidate.expectedCtc).toLocaleString('en-IN')}` : 'Not Specified', icon: DollarSign },
    { label: 'Sourcing Channel', value: candidate.source || 'Not Specified', icon: Clipboard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-violet-600 dark:bg-violet-850 px-6 py-6 text-white shrink-0 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
          
          <h2 className="text-lg font-black tracking-tight">{candidate.name}</h2>
          <p className="text-xs text-white/80 font-medium mt-1">
            {candidate.role} {candidate.department ? `— ${candidate.department}` : ''}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          
          {/* Contact Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800/40">
            {/* Email */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Email Address</span>
              {candidate.email ? (
                <a 
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                >
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate max-w-[130px]">{candidate.email}</span>
                </a>
              ) : (
                <span className="text-xs text-gray-400 font-medium">None</span>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Phone Number</span>
              {candidate.phone ? (
                <a 
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                >
                  <Phone size={12} className="shrink-0" />
                  <span>{candidate.phone}</span>
                </a>
              ) : (
                <span className="text-xs text-gray-400 font-medium">None</span>
              )}
            </div>
          </div>

          {/* Job Details List */}
          <div className="space-y-3.5">
            {detailRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6.5 h-6.5 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <Icon size={13} />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{row.label}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{row.value}</span>
                </div>
              );
            })}
          </div>

          {/* Notes Block */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Candidate Notes</span>
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/40 rounded-xl">
              <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                {candidate.notes || 'No notes added for this applicant.'}
              </p>
            </div>
          </div>

          {/* Resume Preview & Download Link */}
          <div className="space-y-2 pt-2 shrink-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Applicant Resume</span>
            {candidate.resumeUrl ? (
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/70 dark:border-emerald-900/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">Candidate_Resume.pdf</span>
                </div>
                <a
                  href={candidate.resumeUrl.includes('/upload/') ? candidate.resumeUrl.replace('/upload/', '/upload/fl_attachment/') : candidate.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-sm shadow-emerald-500/10"
                >
                  <Download size={11} />
                  <span>Download</span>
                </a>
              </div>
            ) : (
              <div className="p-3.5 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                <span className="text-xs text-gray-400 dark:text-gray-505 font-medium">No resume document has been uploaded</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-bold text-gray-700 dark:text-gray-200 transition"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
