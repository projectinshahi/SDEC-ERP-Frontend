'use client';

import { Card, CardBody } from '@/components/Card';
import { LeaveBalance } from '@/lib/hr/leave.types';
import { Calendar, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  employeeName?: string;
}

const BALANCES_THEMES = {
  'Casual Leave': {
    color: 'teal',
    bg: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100/50 dark:border-teal-900/30',
    bar: 'bg-teal-500',
    icon: Calendar,
  },
  'Sick Leave': {
    color: 'amber',
    bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30',
    bar: 'bg-amber-500',
    icon: HeartPulse,
  },
  'Paid Leave': {
    color: 'emerald',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30',
    bar: 'bg-emerald-500',
    icon: ShieldCheck,
  },
  'Emergency Leave': {
    color: 'rose',
    bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/30',
    bar: 'bg-rose-500',
    icon: AlertTriangle,
  },
};

export function LeaveBalanceCard({ balances, employeeName }: LeaveBalanceCardProps) {
  return (
    <div className="space-y-4">
      {employeeName && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Leave Balances for <span className="text-teal-600 dark:text-teal-400 font-bold">{employeeName}</span>
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">Current Year (2026)</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((bal) => {
          const theme = BALANCES_THEMES[bal.leaveType] || BALANCES_THEMES['Casual Leave'];
          const Icon = theme.icon;
          const usagePercent = Math.min(100, Math.round((bal.used / bal.allocated) * 100));
          
          return (
            <Card key={bal.leaveType} className="overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
              <CardBody className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 block uppercase tracking-wider">
                      {bal.leaveType}
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">
                      {bal.remaining} <span className="text-xs font-medium text-gray-500 dark:text-gray-400">days left</span>
                    </h3>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${theme.bg}`}>
                    <Icon size={16} />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-2xs font-semibold text-gray-500 dark:text-gray-400">
                    <span>Used: {bal.used}d / {bal.allocated}d</span>
                    {bal.pending > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Pending: {bal.pending}d</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${theme.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
