'use client';

import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Download } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { previewLeadImport, importLeads } from '@/lib/api/leadLifecycle';
import type { ImportPreview, ImportResult, ImportMapping, ImportFieldKey } from '@/lib/types/leadLifecycle';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

// The 7 mandatory columns, in the exact spec order. MAP_FIELDS (mapping
// dropdowns), TEMPLATE_HEADERS (download) and the required-note all derive from
// this one list so they can never drift. Stage is omitted — imports enter at NQL.
const REQUIRED_COLUMNS: { key: ImportFieldKey; label: string; sample: string }[] = [
  { key: 'source', label: 'Lead Source', sample: 'outreach' },
  { key: 'title', label: 'Opportunity Name', sample: 'Acme Website Redesign' },
  { key: 'salesperson', label: 'Owner', sample: 'Priya Sharma' },
  { key: 'expectedRevenue', label: 'Opportunity Value', sample: '250000' },
  { key: 'temperature', label: 'Lead Status', sample: 'WARM' },
  { key: 'name', label: 'Contact Name', sample: 'John Doe' },
  { key: 'phone', label: 'Phone', sample: '+91 98765 43210' },
];

const MAP_FIELDS: { key: ImportFieldKey; label: string }[] = REQUIRED_COLUMNS.map(({ key, label }) => ({ key, label }));
const TEMPLATE_HEADERS = REQUIRED_COLUMNS.map((c) => c.label);

/**
 * Builds + downloads the sample import template as a real .xlsx file (matching
 * the attached Excel format), generated client-side with ExcelJS. The header row
 * uses the exact column names in the exact order the importer expects. The Owner
 * cell is pre-filled with the authenticated downloader's name (falls back to the
 * placeholder when unknown) so imported leads default to that user.
 */
async function downloadSampleTemplate(ownerName?: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');

  sheet.columns = TEMPLATE_HEADERS.map((header) => ({
    header,
    width: header === 'Opportunity Name' ? 28 : 20,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(REQUIRED_COLUMNS.map((c) => (c.key === 'salesperson' && ownerName?.trim() ? ownerName.trim() : c.sample)));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Step = 'upload' | 'preview' | 'done';

const validityBadge: Record<string, 'success' | 'danger' | 'warning'> = {
  valid: 'success', invalid: 'danger', duplicate: 'warning',
};

/**
 * Multi-step bulk import: upload → preview (counts + per-row validity + optional
 * column mapping) → import (detailed results). CSV/XLSX only. Uses the CRM
 * template format (Opportunity, Contact Name, Email, Salesperson, Expected
 * Revenue, Stage); legacy column names are still auto-detected for back-compat.
 */
export function ImportLeadsModal({ isOpen, onClose, onImported }: ImportLeadsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
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

  const handleDownloadTemplate = async () => {
    try {
      await downloadSampleTemplate(user?.name);
    } catch (error: any) {
      toast(error?.message || 'Failed to generate template', 'error');
    }
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
            Upload a CSV or XLSX file using the CRM import template. After parsing you can map
            columns and preview validation before importing. Imported leads default to source{' '}
            <strong>Import</strong>.
          </p>

          {/* Expected format + template download */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Expected Import Format</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_HEADERS.map((h, i) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-gray-400">{i + 1}.</span> {h}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  All <strong>7 columns are required</strong> — rows missing any value (or with an unknown Lead Source / Owner, or a Lead Status other than COLD/WARM/HOT) are rejected with a per-row reason. Every imported lead enters the pipeline at the <strong>NQL</strong> stage.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-1.5" /> Download Sample Template
              </Button>
            </div>
          </div>

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
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={preview.total} />
            <Stat label="Valid" value={preview.valid} tone="text-emerald-600" />
            <Stat label="Invalid" value={preview.invalid} tone="text-rose-600" />
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
                    <option value="">Auto-detect</option>
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
                  <th className="px-3 py-2 font-medium text-gray-500">Opportunity</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Contact</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Revenue</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Stage</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-1.5 text-gray-400">{r.rowNumber}</td>
                    <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200">{r.title || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.name || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 tabular-nums">{r.expectedRevenue || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.stage || '—'}</td>
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
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Imported" value={result.imported} tone="text-emerald-600" />
            <Stat label="Skipped" value={result.skipped} tone="text-rose-600" />
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
