'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Landmark, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { MOCK_PAYROLL, PayrollRecord } from '@/lib/hr/mockData';

export function PayrollOverview() {
  const [payrollList, setPayrollList] =
    useState<PayrollRecord[]>(MOCK_PAYROLL);

  const handleProcessPayroll = (id: string) => {
    setPayrollList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: 'Processed',
            processed: item.totalEmployees,
            pending: 0,
          };
        }
        return item;
      })
    );
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-850 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Payroll Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Salary processing stats
            </p>
          </div>

          <Link
            href="/dashboard/hr/payroll"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600 transition"
          >
            View All
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-100 dark:border-gray-850 bg-gray-50/40 dark:bg-gray-900/20">
        <MiniCard title="Total Employees" value="48" />
        <MiniCard title="Processed" value="36" valueClass="text-emerald-600 dark:text-emerald-300" />
        <MiniCard title="Pending" value="12" valueClass="text-amber-600 dark:text-amber-300" />
        <MiniCard title="Total Amount" value="₹8,45,000" />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-850 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="py-4 px-6 text-left">Month</th>
              <th className="py-4 px-4 text-center">Employees</th>
              <th className="py-4 px-4 text-center">Processed</th>
              <th className="py-4 px-4 text-center">Pending</th>
              <th className="py-4 px-4 text-left">Amount</th>
              <th className="py-4 px-4 text-left">Status</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {payrollList.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition"
              >
                <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                  {row.month}
                </td>

                <td className="py-4 px-4 text-center text-sm">
                  {row.totalEmployees}
                </td>

                <td className="py-4 px-4 text-center text-sm font-bold text-emerald-600 dark:text-emerald-300">
                  {row.processed}
                </td>

                <td className="py-4 px-4 text-center text-sm font-bold text-amber-600 dark:text-amber-300">
                  {row.pending}
                </td>

                <td className="py-4 px-4 text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                  {row.totalAmount}
                </td>

                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      row.status === 'Processed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                    }`}
                  >
                    {row.status === 'Processed' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {row.status}
                  </span>
                </td>

                <td className="py-4 px-6 text-right">
                  {row.status === 'Processed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 size={13} />
                      Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => handleProcessPayroll(row.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Landmark size={13} />
                      Process Payroll
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MiniCard({
  title,
  value,
  valueClass = '',
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p
        className={`mt-2 text-xl font-black tabular-nums text-gray-900 dark:text-white ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}