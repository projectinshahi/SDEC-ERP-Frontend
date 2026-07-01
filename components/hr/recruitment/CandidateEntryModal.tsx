'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Loader2, Upload, FileText, AlertCircle } from 'lucide-react';
import { uploadResumeFile, ApiCandidate } from '@/lib/api/hr-recruitment';

interface CandidateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ApiCandidate | null;
  onSave: (payload: any) => Promise<void>;
}

const SOURCES = ['LinkedIn', 'Indeed', 'Referral', 'Walk-in', 'Other'];

export function CandidateEntryModal({
  isOpen,
  onClose,
  candidate,
  onSave,
}: CandidateEntryModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('');
  const [expectedCtc, setExpectedCtc] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('LinkedIn');

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (candidate) {
        setFullName(candidate.full_name);
        setPhone(candidate.phone ?? '');
        setDepartment(candidate.department ?? '');
        setPosition(candidate.position);
        setEmail(candidate.email ?? '');
        setExperience(candidate.experience ?? '');
        setExpectedCtc(candidate.expected_ctc ? String(candidate.expected_ctc) : '');
        setResumeUrl(candidate.resume_url ?? '');
        setResumeName(candidate.resume_url ? 'Existing Resume' : '');
        setInterviewDate(candidate.interview_date ? candidate.interview_date.split('T')[0] : '');
        setNotes(candidate.notes ?? '');
        setSource(candidate.source ?? 'LinkedIn');
      } else {
        setFullName('');
        setPhone('');
        setDepartment('');
        setPosition('');
        setEmail('');
        setExperience('');
        setExpectedCtc('');
        setResumeUrl('');
        setResumeName('');
        setInterviewDate('');
        setNotes('');
        setSource('LinkedIn');
      }
      setErrorMsg(null);
    }
  }, [isOpen, candidate]);

  // Handle Resume Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type Validation: PDF, DOC, DOCX
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(ext)) {
      setErrorMsg('Invalid file format. Only PDF, DOC, and DOCX files are allowed.');
      return;
    }

    // Size Validation: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await uploadResumeFile(file);
      if (res.success) {
        setResumeUrl(res.url);
        setResumeName(res.fileName);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to upload resume file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone Number is required.');
      return;
    }
    if (!position.trim()) {
      setErrorMsg('Position is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        full_name: fullName,
        phone,
        department: department || null,
        position,
        email: email || null,
        experience: experience || null,
        expected_ctc: expectedCtc ? Number(expectedCtc) : null,
        resume_url: resumeUrl || null,
        interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
        notes: notes || null,
        source: source || null,
        skills: candidate?.skills || null, // Preserve skills
        match_score: candidate?.match_score || null, // Preserve match score
      };
      await onSave(payload);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'An error occurred while saving candidate details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-850 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {candidate ? 'Edit Candidate' : 'Add Candidate'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {candidate ? 'Modify candidate profile info' : 'Add a new candidate to the pipeline'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Position *</label>
              <input
                type="text"
                required
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="e.g. MERN Developer"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. rahul@test.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +91 9999999999"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Experience */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Experience</label>
              <input
                type="text"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                placeholder="e.g. 2 Years"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>

            {/* Expected CTC */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Expected CTC (Annual)</label>
              <input
                type="number"
                value={expectedCtc}
                onChange={e => setExpectedCtc(e.target.value)}
                placeholder="e.g. 800000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sourcing Channel</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer transition"
              >
                {SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Interview Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Interview Date (Optional)</label>
              <input
                type="date"
                value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Resume Upload */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Resume Document</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx"
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
                <span>Choose Resume File</span>
              </button>

              {resumeName && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold max-w-[200px] truncate border border-emerald-100 dark:border-emerald-900/30">
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{resumeName}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Supported formats: PDF, DOC, DOCX. Max file size: 5MB.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Candidate Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Excellent communication skills, strong Javascript foundation..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-850 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
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
                'Save Candidate'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
