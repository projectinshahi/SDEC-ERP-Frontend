'use client';

import Link from 'next/link';
import { UserPlus, BadgeCent, Star, ArrowRight } from 'lucide-react';

const ACTIONS = [
  {
    id: 'add-employee',
    label: 'Add Employee',
    href: '/dashboard/hr/employees',
    icon: UserPlus,
    iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300',
    border: 'border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700',
  },
  {
    id: 'process-payroll',
    label: 'Process Payroll',
    href: '/dashboard/hr/payroll',
    icon: BadgeCent,
    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700',
  },
  {
    id: 'start-review',
    label: 'Start Review Cycle',
    href: '/dashboard/hr/performance',
    icon: Star,
    iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
    border: 'border-violet-100 dark:border-violet-900/30 hover:border-violet-300 dark:hover:border-violet-700',
  },
];

export function QuickActionsCompact() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quick Actions</h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Common HR shortcuts</p>
      </div>

      {/* List layout */}
      <div className="flex-1 p-4 flex flex-col gap-2.5 justify-center">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              id={`quick-action-${action.id}`}
              href={action.href}
              className={`
                group flex items-center justify-between rounded-xl border p-3
                transition-all duration-300
                hover:-translate-y-0.5 hover:shadow-sm
                bg-white dark:bg-gray-900
                ${action.border}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${action.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon size={16} />
                </div>
                <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-100 truncate">{action.label}</span>
              </div>

              {/* Arrow */}
              <ArrowRight
                size={14}
                className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
