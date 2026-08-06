'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { ApiAttendanceSettings, fetchAttendanceSettings, updateAttendanceSettings } from '@/lib/api/hr-attendance-settings';
import { usePermissions } from '@/lib/hooks/usePermissions';

function ColorInput({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 group">
      <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
        {label}
      </span>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent disabled:opacity-50"
        />
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-right bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 rounded px-1 disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export function AttendanceSettingsCard() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('hr.settings.edit');

  const [settings, setSettings] = useState<ApiAttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAttendanceSettings()
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? 'Failed to load attendance settings'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof ApiAttendanceSettings>(key: K, val: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: val };
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAttendanceSettings(settings);
      setSettings(updated);
      
      // Update local storage or trigger a re-render for settings cache if needed
      // (For now, a simple page reload could force components to refetch, or we use a context)
      window.dispatchEvent(new Event('attendance-settings-updated'));

    } catch (e: any) {
      setError(e?.message ?? 'Failed to save attendance settings');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex justify-center py-12 shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
        <AlertCircle size={16} /> {error ?? 'Attendance settings unavailable.'}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]">
      
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Attendance Colors</h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configure the status colors used across the attendance dashboard and reports.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <ColorInput label="Present Color" value={settings.present_color} onChange={(v) => set('present_color', v)} disabled={!canEdit || saving} />
          <ColorInput label="Absent Color" value={settings.absent_color} onChange={(v) => set('absent_color', v)} disabled={!canEdit || saving} />
          <ColorInput label="Leave Color" value={settings.leave_color} onChange={(v) => set('leave_color', v)} disabled={!canEdit || saving} />
          <ColorInput label="Half Day Color" value={settings.half_day_color} onChange={(v) => set('half_day_color', v)} disabled={!canEdit || saving} />
          <ColorInput label="Late Color" value={settings.late_color} onChange={(v) => set('late_color', v)} disabled={!canEdit || saving} />
        </div>
      </div>

      <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0 flex items-center justify-between">
        {canEdit ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ml-auto shadow-sm"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Settings</>}
          </button>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium text-right w-full">You have view-only access to attendance settings.</p>
        )}
      </div>

    </div>
  );
}
