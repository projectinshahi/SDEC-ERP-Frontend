'use client';

import { useState, useEffect } from 'react';

export function useViewMode(moduleKey: string, defaultMode: 'grid' | 'list' = 'list') {
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(defaultMode);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storageKey = `view_mode_${moduleKey}`;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'grid' || stored === 'list') {
      setViewModeState(stored);
    }
  }, [moduleKey]);

  const setViewMode = (mode: 'grid' | 'list') => {
    setViewModeState(mode);
    const storageKey = `view_mode_${moduleKey}`;
    localStorage.setItem(storageKey, mode);
  };

  return [isMounted ? viewMode : defaultMode, setViewMode] as const;
}
