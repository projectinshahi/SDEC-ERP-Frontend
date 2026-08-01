'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ApiPayrollSettings,
  fetchPayrollSettings,
  updatePayrollSettings,
} from '@/lib/api/hr-payroll';
import { usePermissions } from '@/lib/hooks/usePermissions';

/** A labelled input row. `reserved` marks settings stored but not yet wired into the calc. */
function Field({
  label, hint, value, onChange, disabled, type = 'number', suffix, reserved,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  disabled: boolean; type?: 'number' | 'text'; suffix?: string; reserved?: boolean;
}) {
  const id = `pset-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
        {reserved && (
          <span className="normal-case font-semibold text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">reserved</span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          min={type === 'number' ? '0' : undefined}
          step={type === 'number' ? '0.01' : undefined}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{hint}</p>}
    </div>
  );
}

export function PayrollSettingsCard() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('hr.settings.edit');

  const [settings, setSettings] = useState<ApiPayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPayrollSettings()
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? 'Failed to load payroll settings'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof ApiPayrollSettings>(key: K, raw: string) => {
    setSavedAt(false);
    setSettings((prev) => {
      if (!prev) return prev;
      const isNum = typeof prev[key] === 'number';
      return { ...prev, [key]: isNum ? (Number(raw) || 0) : raw } as ApiPayrollSettings;
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePayrollSettings(settings);
      setSettings(updated);
      setSavedAt(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
        <AlertCircle size={16} /> {error ?? 'Payroll settings unavailable.'}
      </div>
    );
  }

  const s = settings;
  const disabled = !canEdit || saving;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-850">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500">
          <Wallet size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Payroll Settings</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            Applied to NEWLY generated payrolls only — existing records are unaffected.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Active in calculation */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Active in Calculation</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Provident Fund" hint="PF = Gross × this %" suffix="%" value={String(s.providentFundPct)} onChange={(v) => set('providentFundPct', v)} disabled={disabled} />
            <Field label="Employee State Insurance" hint="ESI = Gross × this %" suffix="%" value={String(s.esiPct)} onChange={(v) => set('esiPct', v)} disabled={disabled} />
          </div>
        </div>

        {/* Reserved (stored, not yet wired) */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reserved — stored for future rules</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Professional Tax" reserved suffix="₹" value={String(s.professionalTax)} onChange={(v) => set('professionalTax', v)} disabled={disabled} />
            <Field label="TDS" reserved suffix="%" value={String(s.tdsPct)} onChange={(v) => set('tdsPct', v)} disabled={disabled} />
            <Field label="Overtime Rate" reserved suffix="₹/hr" value={String(s.overtimeRate)} onChange={(v) => set('overtimeRate', v)} disabled={disabled} />
            <Field label="Late Deduction Rule" reserved type="text" value={s.lateDeductionRule} onChange={(v) => set('lateDeductionRule', v)} disabled={disabled} />
            <Field label="Half Day Rule" reserved type="text" value={s.halfDayRule} onChange={(v) => set('halfDayRule', v)} disabled={disabled} />
            <Field label="Loss of Pay Rule" reserved type="text" value={s.lossOfPayRule} onChange={(v) => set('lossOfPayRule', v)} disabled={disabled} />
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center justify-end gap-3">
            {savedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-850 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm shadow-blue-500/20"
            >
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Settings</>}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium text-right">You have view-only access to payroll settings.</p>
        )}
      </div>
    </div>
  );
}
