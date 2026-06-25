'use client';

import { useState, useMemo } from 'react';
import { Search, RefreshCw, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card } from '@/components/Card';
import { MOCK_ATTENDANCE, EmployeeAttendance } from '@/lib/hr/mockData';

export function AttendanceTable() {
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>(MOCK_ATTENDANCE);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const departments = useMemo(() => {
    const depts = new Set(attendance.map((a) => a.department));
    return ['All', ...Array.from(depts)];
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === 'All' || item.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [attendance, searchTerm, deptFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredAttendance.map((item) => item.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleMarkAction = (id: string, currentStatus: string) => {
    setAttendance((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (currentStatus === 'Absent') {
            return { ...item, status: 'Present', checkIn: '09:00 AM' };
          } else {
            return { ...item, checkOut: '06:00 PM' };
          }
        }
        return item;
      })
    );
  };

  const handleBulkUpdate = (newStatus: 'Present' | 'Absent' | 'Late') => {
    if (selectedIds.length === 0) return;
    setAttendance((prev) =>
      prev.map((item) => {
        if (selectedIds.includes(item.id)) {
          const checkIn = newStatus === 'Absent' ? '-' : '09:00 AM';
          return { ...item, status: newStatus, checkIn, checkOut: '-' };
        }
        return item;
      })
    );
    setSelectedIds([]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setAttendance(MOCK_ATTENDANCE);
      setSearchTerm('');
      setDeptFilter('All');
      setSelectedIds([]);
      setIsRefreshing(false);
    }, 600);
  };

  return (
  <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm h-full flex flex-col">
    {/* Header */}
    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Mark Attendance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Wednesday, 24 Jun 2026
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <a
            href="/dashboard/hr/attendance"
            className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition text-sm font-semibold"
          >
            View Attendance Sheet
          </a>
        </div>
      </div>
    </div>

    {/* Filters */}
    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full md:w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept === 'All' ? 'All Departments' : dept}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Table */}
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
          <tr className="border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-4 py-4 text-center">✓</th>
            <th className="px-4 py-4">Employee</th>
            <th className="px-4 py-4">Check In</th>
            <th className="px-4 py-4">Check Out</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4 text-right">Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredAttendance.map((row) => {
            const isSelected = selectedIds.includes(row.id);

            return (
              <tr
                key={row.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 ${
                  isSelected ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
                }`}
              >
                <td className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(row.id)}
                  />
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center font-bold text-sm">
                      {row.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.department}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 font-mono text-sm">{row.checkIn}</td>
                <td className="px-4 py-4 font-mono text-sm">{row.checkOut}</td>

                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      row.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.status === 'Absent'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>

                <td className="px-4 py-4 text-right">
                  {row.status === 'Absent' ? (
                    <button
                      onClick={() => handleMarkAction(row.id, 'Absent')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Mark Present
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkAction(row.id, row.status)}
                      disabled={row.checkOut !== '-'}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                    >
                      {row.checkOut !== '-' ? 'Checked Out' : 'Mark Out'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between flex-wrap gap-3">
      <span className="text-sm text-gray-500">
        {selectedIds.length} employee(s) selected
      </span>

      <div className="flex gap-2">
        <button
          onClick={() => handleBulkUpdate('Present')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
        >
          Present
        </button>

        <button
          onClick={() => handleBulkUpdate('Absent')}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold"
        >
          Absent
        </button>

        <button
          onClick={() => handleBulkUpdate('Late')}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold"
        >
          Late
        </button>
      </div>
    </div>
  </Card>
);
}
