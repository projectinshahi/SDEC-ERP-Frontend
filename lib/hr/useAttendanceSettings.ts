'use client';

import { useState, useEffect } from 'react';
import { ApiAttendanceSettings, fetchAttendanceSettings } from '@/lib/api/hr-attendance-settings';

/* Module-level cache shared by every consumer. The settings are org-wide and
 * change only from the HR Settings page, yet the hook is mounted once per
 * status badge / table row — without this cache an attendance table of N rows
 * issued N identical GET /hr/attendance/settings requests on every render. */
let cache: ApiAttendanceSettings | null = null;
let inflight: Promise<ApiAttendanceSettings> | null = null;
const listeners = new Set<() => void>();

function load(force = false): Promise<ApiAttendanceSettings> {
  if (!force && cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetchAttendanceSettings()
      .then((s) => { cache = s; listeners.forEach((l) => l()); return s; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Push freshly saved settings into the cache (no refetch) and notify every mounted consumer. */
export function primeAttendanceSettings(s: ApiAttendanceSettings) {
  cache = s;
  listeners.forEach((l) => l());
}

/**
 * Hook to globally fetch and cache attendance settings (status colours + lunch
 * timings) so components can apply dynamic styling and thresholds.
 */
export function useAttendanceSettings() {
  const [settings, setSettings] = useState<ApiAttendanceSettings | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    const sync = () => { if (!cancelled) { setSettings(cache); setLoading(false); } };
    listeners.add(sync);
    load().then(sync).catch((e) => {
      console.error('Failed to load attendance settings', e);
      if (!cancelled) setLoading(false);
    });

    const onUpdate = () => { load(true).catch(() => {}); };
    window.addEventListener('attendance-settings-updated', onUpdate);

    return () => {
      cancelled = true;
      listeners.delete(sync);
      window.removeEventListener('attendance-settings-updated', onUpdate);
    };
  }, []);

  return { settings, loading };
}
