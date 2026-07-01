'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Wallet, CheckCircle, Clock, CalendarRange } from 'lucide-react';

interface PayrollStatsProps {
  stats: {
    totalAmount: number;
    paidCount: number;
    pendingCount: number;
    monthlyExpense: number;
    expenseMonthName: string;
  };
}

export function PayrollStats({ stats }: PayrollStatsProps) {
  const cards = [
    {
      label: 'Total Payroll Amount',
      value: `₹${stats.totalAmount.toLocaleString('en-IN')}`,
      subText: 'Cumulative overall expense',
      icon: Wallet,
      color: 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-300',
    },
    {
      label: 'Paid Employees',
      value: stats.paidCount,
      subText: 'Completed payment logs',
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'Pending Payments',
      value: stats.pendingCount,
      subText: 'Awaiting HR action',
      icon: Clock,
      color: 'bg-amber-50 text-amber-650 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Monthly Expense',
      value: `₹${stats.monthlyExpense.toLocaleString('en-IN')}`,
      subText: `Total in ${stats.expenseMonthName}`,
      icon: CalendarRange,
      color: 'bg-blue-50 text-blue-650 dark:bg-blue-950/40 dark:text-blue-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="p-5 rounded-2xl border border-gray-150 dark:border-gray-850 bg-white dark:bg-gray-900 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="text-2xl font-black mt-2 text-gray-905 dark:text-white tabular-nums tracking-tight">
                  {card.value}
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium block mt-1">
                  {card.subText}
                </span>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon size={20} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
