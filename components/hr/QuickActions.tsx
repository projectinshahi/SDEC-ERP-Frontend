'use client';

import Link from 'next/link';
import {
  UserPlus,
  CalendarCheck,
  Plane,
  Briefcase,
  BadgeCent,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/Card';

const actions = [
  {
    label: 'Add Employee',
    href: '/dashboard/hr/employees',
    icon: UserPlus,
    variant:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
    border:
      'border-indigo-100 dark:border-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-700',
  },
  {
    label: 'Mark Attendance',
    href: '/dashboard/hr/attendance',
    icon: CalendarCheck,
    variant:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    border:
      'border-emerald-100 dark:border-emerald-900 hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  {
    label: 'Apply Leave',
    href: '/dashboard/hr/leave',
    icon: Plane,
    variant:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    border:
      'border-rose-100 dark:border-rose-900 hover:border-rose-300 dark:hover:border-rose-700',
  },
  {
    label: 'Add Job Opening',
    href: '/dashboard/hr/recruitment',
    icon: Briefcase,
    variant:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
    border:
      'border-violet-100 dark:border-violet-900 hover:border-violet-300 dark:hover:border-violet-700',
  },
  {
    label: 'Process Payroll',
    href: '/dashboard/hr/payroll',
    icon: BadgeCent,
    variant:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    border:
      'border-amber-100 dark:border-amber-900 hover:border-amber-300 dark:hover:border-amber-700',
  },
  {
    label: 'Upload Document',
    href: '/dashboard/hr/documents',
    icon: Upload,
    variant:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    border:
      'border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700',
  },
];

export function QuickActions() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Quick Actions
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Common HR activities
        </p>
      </div>

      {/* Actions Grid */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {actions.map((act) => {
          const Icon = act.icon;

          return (
            <Link
              key={act.label}
              href={act.href}
              className={`group rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${act.border}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${act.variant}`}
              >
                <Icon
                  size={20}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              <div className="flex items-end justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                  {act.label}
                </span>

                <ArrowRight
                  size={14}
                  className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}