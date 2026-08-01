'use client';

import React from 'react';
import { Pencil, Trash2, Mail, Phone, Eye, CheckCircle, FileText } from 'lucide-react';
import { Candidate, CandidateStage } from '@/lib/hr/recruitment.types';
import { Card } from '@/components/Card';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

interface CandidateCardProps {
  candidate: Candidate;
  onView: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: CandidateStage) => void;
}

const STAGES: CandidateStage[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
];

export function CandidateCard({
  candidate,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: CandidateCardProps) {
  return (
    <Card className="p-4 rounded-xl border border-gray-250 dark:border-gray-850 bg-white dark:bg-gray-900 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[175px]">
      
      {/* Header Info */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
              {candidate.name}
            </h4>
            <p className="text-[11px] text-gray-500 font-semibold mt-1">
              {candidate.role} {candidate.department ? `(${candidate.department})` : ''}
            </p>
          </div>

          {/* Sourcing Channel Badge */}
          {candidate.source && (
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/30 shrink-0">
              {candidate.source}
            </span>
          )}
        </div>

        {/* Experience */}
        <p className="text-[10px] font-bold text-gray-650 dark:text-gray-400 mt-2">
          Experience: {candidate.experience}
        </p>

        {/* Contact Info */}
        <div className="mt-3 space-y-1 text-[10px] text-gray-400 dark:text-gray-550 font-medium">
          {candidate.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10.5} className="shrink-0" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={10.5} className="shrink-0" />
              <span className="truncate max-w-[190px]">{candidate.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-850/60 flex flex-col gap-2.5">
        
        {/* Resume Indicator & Stage Transition */}
        <div className="flex items-center justify-between gap-2">
          {/* Resume status */}
          {candidate.resumeUrl ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={12} />
              <span>Resume</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-300 dark:text-gray-600">
              <FileText size={12} />
              <span>No Resume</span>
            </div>
          )}

          {/* Inline Stage Dropdown */}
          <PermissionGuard require="hr.recruitment.edit">
            <select
              value={candidate.stage}
              onChange={(e) => onStageChange(candidate.id, e.target.value as CandidateStage)}
              className="text-[10px] font-bold text-gray-600 dark:text-gray-350 bg-gray-50 dark:bg-gray-800 border border-gray-150 dark:border-gray-700/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition cursor-pointer"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </PermissionGuard>
        </div>

        {/* Card Actions Panel */}
        <div className="flex items-center justify-end gap-1 shrink-0">
          <button
            onClick={() => onView(candidate)}
            title="View candidate profile"
            className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          >
            <Eye size={13.5} />
          </button>
          <PermissionGuard require="hr.recruitment.edit">
            <button
              onClick={() => onEdit(candidate)}
              title="Edit details"
              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
            >
              <Pencil size={13} />
            </button>
          </PermissionGuard>
          <PermissionGuard require="hr.recruitment.delete">
            <button
              onClick={() => onDelete(candidate.id)}
              title="Delete applicant"
              className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </PermissionGuard>
        </div>

      </div>
    </Card>
  );
}