'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { FileText, Clock, BadgeCheck, AlertTriangle } from 'lucide-react';

interface DocumentsStatsProps {
  stats: {
    totalCount: number;
    pendingCount: number;
    verifiedCount: number;
    expiringSoonCount: number;
  };
}

export function DocumentsStats({ stats }: DocumentsStatsProps) {
  const cards = [
    {
      label: 'Total Documents',
      value: stats.totalCount,
      subText: 'All uploaded employee records',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-300',
    },
    {
      label: 'Pending Verification',
      value: stats.pendingCount,
      subText: 'Awaiting HR audit',
      icon: Clock,
      color: 'bg-amber-50 text-amber-650 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Verified Documents',
      value: stats.verifiedCount,
      subText: 'Approved active records',
      icon: BadgeCheck,
      color: 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoonCount,
      subText: 'Expires within 30 days',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-650 dark:bg-rose-950/40 dark:text-rose-300',
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
