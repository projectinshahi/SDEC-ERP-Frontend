'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { submitApproval } from '@/lib/api/documentApprovals';
import { fetchLeads } from '@/lib/api/leads';
import { fetchPipelineDeals } from '@/lib/api/pipeline';
import type { DocType } from '@/lib/types/salesExecution';

interface SubmitDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  presetLeadId?: number;
  presetDealId?: number;
}

const DOC_TYPES: DocType[] = ['BRD', 'Proposal', 'Quotation', 'Scope', 'Agreement', 'Other'];

type ParentKind = 'deal' | 'lead';

interface Option {
  value: string;
  label: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function SubmitDocumentModal({
  isOpen,
  onClose,
  onSubmitted,
  presetLeadId,
  presetDealId,
}: SubmitDocumentModalProps) {
  const { toast } = useToast();

  const hasPreset = presetLeadId != null || presetDealId != null;

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('Proposal');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('v1');
  const [changeNotes, setChangeNotes] = useState('');
  const [comments, setComments] = useState('');

  const [parentKind, setParentKind] = useState<ParentKind>(presetLeadId != null ? 'lead' : 'deal');
  const [parentId, setParentId] = useState('');

  const [leadOptions, setLeadOptions] = useState<Option[]>([]);
  const [dealOptions, setDealOptions] = useState<Option[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  const [errors, setErrors] = useState<{ file?: string; changeNotes?: string; parent?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset all fields whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setDocType('Proposal');
    setTitle('');
    setVersion('v1');
    setChangeNotes('');
    setComments('');
    setParentKind(presetLeadId != null ? 'lead' : 'deal');
    setParentId('');
    setErrors({});
    setSubmitting(false);
  }, [isOpen, presetLeadId, presetDealId]);

  // Load lead/deal options for the parent picker (only when not preset).
  useEffect(() => {
    if (!isOpen || hasPreset) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingParents(true);
        const [leads, pipeline] = await Promise.all([fetchLeads(), fetchPipelineDeals()]);
        if (cancelled) return;
        setLeadOptions(
          leads.map((l) => ({
            value: String(l.id),
            label: l.customer?.company ? `${l.title} — ${l.customer.company}` : l.title,
          })),
        );
        setDealOptions(pipeline.deals.map((d) => ({ value: String(d.id), label: d.title })));
      } catch (err: any) {
        if (!cancelled) toast(err?.message || 'Failed to load leads and deals', 'error');
      } finally {
        if (!cancelled) setLoadingParents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, hasPreset, toast]);

  const parentOptions = parentKind === 'lead' ? leadOptions : dealOptions;

  const presetLabel = useMemo(() => {
    if (presetLeadId != null) return `Lead #${presetLeadId}`;
    if (presetDealId != null) return `Deal #${presetDealId}`;
    return '';
  }, [presetLeadId, presetDealId]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!file) next.file = 'A document file is required.';
    if (!changeNotes.trim()) next.changeNotes = 'Change notes are required.';
    if (!hasPreset && !parentId) next.parent = 'Select exactly one parent lead or deal.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !file) return;

    // Resolve the single parent (preset wins).
    let leadId: number | undefined;
    let dealId: number | undefined;
    if (presetLeadId != null) leadId = presetLeadId;
    else if (presetDealId != null) dealId = presetDealId;
    else if (parentKind === 'lead') leadId = Number(parentId);
    else dealId = Number(parentId);

    try {
      setSubmitting(true);
      await submitApproval({
        file,
        docType,
        title: title.trim() || file.name,
        version: version.trim() || undefined,
        changeNotes: changeNotes.trim(),
        comments: comments.trim() || undefined,
        leadId,
        dealId,
      });
      toast('Document submitted for approval', 'success');
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to submit document', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Document for Approval" size="lg">
      <div className="space-y-5">
        {/* File input */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Document File<span className="ml-1 font-bold text-red-500">*</span>
          </label>
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex min-w-0 items-center gap-3">
                <FileUp size={18} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-white hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 ${
                errors.file
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <FileUp size={24} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Click to choose a file
              </span>
              <span className="text-xs text-gray-400">PDF, DOCX, XLSX or any document</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setErrors((prev) => ({ ...prev, file: undefined }));
                }}
              />
            </label>
          )}
          {errors.file && <p className="text-xs font-semibold text-red-500">{errors.file}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Document Type"
            id="approval-doc-type"
            options={DOC_TYPES}
            value={docType}
            onChange={(v) => setDocType(v as DocType)}
            required
          />
          <InputField
            label="Version"
            id="approval-version"
            value={version}
            onChange={setVersion}
            placeholder="v1"
          />
        </div>

        <InputField
          label="Title"
          id="approval-title"
          value={title}
          onChange={setTitle}
          placeholder={file ? file.name : 'Defaults to the file name'}
        />

        {/* Parent picker */}
        {hasPreset ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Linked to
            </label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {presetLabel}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Parent Type"
              id="approval-parent-kind"
              options={[
                { value: 'deal', label: 'Deal' },
                { value: 'lead', label: 'Lead' },
              ]}
              value={parentKind}
              onChange={(v) => {
                setParentKind(v as ParentKind);
                setParentId('');
              }}
            />
            <SelectField
              label={parentKind === 'lead' ? 'Lead' : 'Deal'}
              id="approval-parent-id"
              options={parentOptions}
              value={parentId}
              onChange={(v) => {
                setParentId(v);
                setErrors((prev) => ({ ...prev, parent: undefined }));
              }}
              placeholder={loadingParents ? 'Loading…' : `Select a ${parentKind}`}
              error={errors.parent}
              required
            />
          </div>
        )}

        <TextareaField
          label="Change Notes"
          id="approval-change-notes"
          value={changeNotes}
          onChange={(v) => {
            setChangeNotes(v);
            setErrors((prev) => ({ ...prev, changeNotes: undefined }));
          }}
          placeholder="Summarise what this document contains or what changed."
          rows={3}
          required
          error={errors.changeNotes}
        />

        <TextareaField
          label="Comments"
          id="approval-comments"
          value={comments}
          onChange={setComments}
          placeholder="Optional note for the reviewer."
          rows={2}
        />

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
            Submit for Approval
          </Button>
        </div>
      </div>
    </Modal>
  );
}
