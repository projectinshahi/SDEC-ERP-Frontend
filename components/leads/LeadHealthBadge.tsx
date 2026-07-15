'use client';

import {
  normalizeTemperature, temperatureLabel, temperatureBadgeClass, temperatureDot,
} from '@/lib/data/leadTemperature';

interface LeadHealthBadgeProps {
  /** Stored lead temperature (COLD / WARM / HOT). */
  temperature: string | null | undefined;
  size?: 'sm' | 'md';
  /** true → "Hot Lead"; false → "Hot". */
  showLabel?: boolean;
}

/**
 * Lead Temperature badge (🔵 Cold / 🟡 Warm / 🔴 Hot). The single reusable
 * temperature pill used on pipeline cards, the list table and the lead profile.
 */
export function LeadHealthBadge({ temperature, size = 'sm', showLabel = true }: LeadHealthBadgeProps) {
  const t = normalizeTemperature(temperature);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${pad} ${temperatureBadgeClass(t)}`}>
      <span aria-hidden>{temperatureDot(t)}</span>
      {showLabel ? `${temperatureLabel(t)} Lead` : temperatureLabel(t)}
    </span>
  );
}
