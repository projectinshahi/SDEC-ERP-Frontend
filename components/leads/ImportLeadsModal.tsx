'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useToast } from '@/lib/hooks/useToast';
import { previewLeadImport, importLeads } from '@/lib/api/leadLifecycle';
import type { ImportPreview, ImportResult, ImportMapping, ImportFieldKey } from '@/lib/types/leadLifecycle';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Target fields the user can map source columns onto.
const MAP_FIELDS: { key: ImportFieldKey; label: string }[] = [
  { key: 'title', label: 'Lead Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'description', label: 'Notes / Description' },
];

type Step = 'upload' | 'preview' | 'done';

const validityBadge: Record<string, 'success' | 'danger' | 'warning'> = {
  valid: 'success', invalid: 'danger', duplicate: 'warning',
};

/**
 * Multi-step bulk import: upload → preview (counts + per-row validity + optional
 * column mapping) → import (detailed results). CSV/XLSX only.
 */
export function ImportLeadsModal({ isOpen, onClose, onImported }: ImportLeadsModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setMapping({});
    setPreview(null);
    setResult(null);
    setIsBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runPreview = useCallback(async (f: File, m: ImportMapping) => {
    try {
      setIsBusy(true);
      const data = await previewLeadImport(f, Object.keys(m).length ? m : undefined);
      setPreview(data);
      setStep('preview');
    } catch (error: any) {
      toast(error?.message || 'Failed to read file', 'error');
    } finally {
      setIsBusy(false);
    }
  }, [toast]);

  const handleFile = async (f: File | null) => {
    setFile(f);
    setMapping({});
    if (f) await runPreview(f, {});
  };

  const updateMapping = async (key: ImportFieldKey, header: string) => {
    const next = { ...mapping };
    if (header) next[key] = header;
    else delete next[key];
    setMapping(next);
    if (file) await runPreview(file, next);
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      setIsBusy(true);
      const res = await importLeads(file, Object.keys(mapping).length ? mapping : undefined);
      setResult(res);
      setStep('done');
      onImported();
    } catch (error: any) {
      toast(error?.message || 'Failed to import leads', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Leads" size="xl">
      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Upload a CSV or XLSX file. After parsing you can map columns and preview validation
            (valid / invalid / duplicate) before importing. Imported leads default to source <strong>Import</strong>.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-500">Click to choose a CSV or XLSX file</span>
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          {isBusy && <p className="text-sm text-gray-500 text-center">Parsing…</p>}
        </div>
      )}

      {/* Step: Preview + mapping */}
      {step === 'preview' && preview && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-blue-700 dark:text-blue-300">
            <FileText size={18} className="shrink-0" />
            <span className="text-sm font-medium truncate">{file?.name}</span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Total" value={preview.total} />
            <Stat label="Valid" value={preview.valid} tone="text-emerald-600" />
            <Stat label="Invalid" value={preview.invalid} tone="text-rose-600" />
            <Stat label="Duplicates" value={preview.duplicate} tone="text-amber-600" />
          </div>

          {/* Field mapping */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Column Mapping (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MAP_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{f.label}</span>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => updateMapping(f.key, e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="">Auto ({f.key})</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Row preview */}
          <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Email</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-1.5 text-gray-400">{r.rowNumber}</td>
                    <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200">{r.title || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.email || '—'}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant={validityBadge[r.validity]}>{r.validity}</Badge>
                      {r.error && <span className="ml-1 text-[10px] text-gray-400">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep('upload')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={handleImport} isLoading={isBusy} disabled={preview.valid === 0}>
              Import {preview.valid} valid {preview.valid === 1 ? 'lead' : 'leads'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Import complete</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Imported" value={result.imported} tone="text-emerald-600" />
            <Stat label="Skipped" value={result.skipped} tone="text-rose-600" />
            <Stat label="Duplicates" value={result.duplicates} tone="text-amber-600" />
            <Stat label="Flagged" value={result.flagged} tone="text-amber-600" />
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-40 overflow-auto text-xs border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" /> Errors
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-gray-500">Row {e.row}: {e.error}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, tone = 'text-gray-900 dark:text-white' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
