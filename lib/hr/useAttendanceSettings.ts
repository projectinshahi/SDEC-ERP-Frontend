'use client';

import { useState, useEffect } from 'react';
import { ApiAttendanceSettings, fetchAttendanceSettings } from '@/lib/api/hr-attendance-settings';

/** 
 * Hook to globally fetch and cache attendance settings (colors) 
 * so components can apply dynamic styling.
 */
export function useAttendanceSettings() {
  const [settings, setSettings] = useState<ApiAttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const load = () => {
      setLoading(true);
      fetchAttendanceSettings()
        .then((s) => {
          if (!cancelled) setSettings(s);
        })
        .catch((e) => {
          console.error('Failed to load attendance settings', e);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();

    const onUpdate = () => load();
    window.addEventListener('attendance-settings-updated', onUpdate);
    
    return () => {
      cancelled = true;
      window.removeEventListener('attendance-settings-updated', onUpdate);
    };
  }, []);

  return { settings, loading };
}
