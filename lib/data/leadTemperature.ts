/**
 * Lead Temperature (COLD / WARM / HOT) display helpers — the manual lead
 * classification that replaces the numeric lead score across the Leads UI.
 * Values are stored uppercase on the lead; labels + badge styling are derived here.
 */

export type LeadTemperature = 'COLD' | 'WARM' | 'HOT';

export const LEAD_TEMPERATURES: LeadTemperature[] = ['COLD', 'WARM', 'HOT'];

/** Coerce any stored/raw value to a canonical temperature (default COLD). */
export function normalizeTemperature(t: string | null | undefined): LeadTemperature {
  const s = String(t ?? '').trim().toUpperCase();
  return s === 'HOT' || s === 'WARM' ? s : 'COLD';
}

const CONFIG: Record<LeadTemperature, { label: string; dot: string; badge: string; text: string }> = {
  HOT: {
    label: 'Hot', dot: '🔴',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40',
    text: 'text-rose-600 dark:text-rose-400',
  },
  WARM: {
    label: 'Warm', dot: '🟡',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  COLD: {
    label: 'Cold', dot: '🔵',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
    text: 'text-blue-600 dark:text-blue-400',
  },
};

/** "Cold" / "Warm" / "Hot" — used in tables, details, and the PDF export. */
export const temperatureLabel = (t: string | null | undefined): string => CONFIG[normalizeTemperature(t)].label;
export const temperatureDot = (t: string | null | undefined): string => CONFIG[normalizeTemperature(t)].dot;
export const temperatureBadgeClass = (t: string | null | undefined): string => CONFIG[normalizeTemperature(t)].badge;
export const temperatureTextClass = (t: string | null | undefined): string => CONFIG[normalizeTemperature(t)].text;

/** Options for a Temperature <select> (value = stored uppercase, label = display). */
export const TEMPERATURE_OPTIONS = LEAD_TEMPERATURES.map((t) => ({ value: t, label: CONFIG[t].label }));
