'use client';

import Link from 'next/link';
import { Bell, AlertTriangle, CheckCircle2, ChevronRight, PackageOpen, Info } from 'lucide-react';
import type { DashboardAlertItem } from '@/lib/api/hrDashboard';

interface PendingAlertsProps {
  items?: DashboardAlertItem[];
  loading?: boolean;
}

const TYPE_CONFIG: Record<string, {
  bg: string;
  border: string;
  icon: React.ElementType;
  iconClass: string;
  badge: string;
}> = {
  critical: {
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-100 dark:border-rose-900/30',
    icon: AlertTriangle,
    iconClass: 'text-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-900/30',
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-100 dark:border-blue-900/30',
    icon: Info,
    iconClass: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-100 dark:border-emerald-900/30',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
};

export function PendingAlerts({ items, loading = false }: PendingAlertsProps) {
  const alerts = items ?? [];
  const criticalCount = alerts.filter((a) => a.type === 'critical').length;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Bell size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Alerts & Actions</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Pending items requiring attention</p>
        </div>
        {criticalCount > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-full border border-rose-100 dark:border-rose-900/40">
            {criticalCount} Critical
          </span>
        )}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <PackageOpen size={28} className="text-gray-300 dark:text-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">All clear — no pending alerts</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-700 mt-1">Everything is on track</p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = TYPE_CONFIG[alert.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
              >
                <div className={`mt-0.5 shrink-0 ${cfg.iconClass}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 leading-snug">{alert.title}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                      {alert.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{alert.desc}</p>
                </div>
                {alert.href && (
                  <Link href={alert.href} className="shrink-0 mt-0.5 hover:opacity-70 transition-opacity">
                    <ChevronRight size={14} className="text-gray-400" />
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
