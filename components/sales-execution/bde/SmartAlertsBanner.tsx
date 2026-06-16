'use client';

import { Bell, AlertTriangle, AlertOctagon, PartyPopper } from 'lucide-react';
import type { SmartAlert } from '@/lib/types/salesExecution';

interface SmartAlertsBannerProps {
  alerts: SmartAlert[];
}

const TONE: Record<SmartAlert['severity'], { wrap: string; icon: string; pill: string }> = {
  info: {
    wrap: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500 dark:text-blue-400',
    pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900 text-amber-800 dark:text-amber-300',
    icon: 'text-amber-500 dark:text-amber-400',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  },
  danger: {
    wrap: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300',
    icon: 'text-rose-500 dark:text-rose-400',
    pill: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  },
};

const ICON: Record<SmartAlert['severity'], React.ComponentType<{ size?: number; className?: string }>> = {
  info: Bell,
  warning: AlertTriangle,
  danger: AlertOctagon,
};

/**
 * Horizontal/stacked set of severity-coloured alert pills for the BDE dashboard.
 * Renders a calm "all caught up" state when there are no alerts.
 */
export function SmartAlertsBanner({ alerts }: SmartAlertsBannerProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 shrink-0">
          <PartyPopper size={18} />
        </span>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          You&apos;re all caught up &#127881;
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {alerts.map((alert, i) => {
        const tone = TONE[alert.severity] ?? TONE.info;
        const Icon = ICON[alert.severity] ?? Bell;
        return (
          <div
            key={`${alert.type}-${i}`}
            className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 ${tone.wrap}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${tone.icon}`} />
            <span className="flex-1 text-sm font-medium leading-snug">{alert.message}</span>
            {alert.count > 0 && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${tone.pill}`}>
                {alert.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
