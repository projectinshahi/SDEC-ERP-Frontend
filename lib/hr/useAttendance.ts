import { useState, useMemo } from 'react';
import { AttendanceRecord, AttendanceFilters, AttendanceSortKey, SortDirection } from './attendance.types';
import { MOCK_ATTENDANCE_RECORDS, computeAttendanceStats, TODAY } from './attendance.mock';

const ITEMS_PER_PAGE = 10;

export function useAttendance() {
  const [records, setRecords]               = useState<AttendanceRecord[]>(MOCK_ATTENDANCE_RECORDS);
  const [selectedDate, setSelectedDate]     = useState(TODAY);
  const [selectedIds, setSelectedIds]       = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [sortKey, setSortKey]               = useState<AttendanceSortKey>('name');
  const [sortDir, setSortDir]               = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage]       = useState(1);
  const [filters, setFilters]               = useState<AttendanceFilters>({
    search: '', department: 'All', status: 'All', date: TODAY,
  });

  const handleFilterChange = (next: Partial<AttendanceFilters>) => {
    setFilters(prev => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleSort = (key: AttendanceSortKey) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  };

  const filtered = useMemo(() =>
    records
      .filter(r => {
        const q = filters.search.toLowerCase();
        return (
          (!q || r.name.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q) || r.department.toLowerCase().includes(q)) &&
          (filters.department === 'All' || r.department === filters.department) &&
          (filters.status === 'All' || r.status === filters.status)
        );
      })
      .sort((a, b) => {
        const va = (a[sortKey] ?? '') as string;
        const vb = (b[sortKey] ?? '') as string;
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }),
  [records, filters, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => computeAttendanceStats(records), [records]);

  const toggleSelectRow = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = (pageIds: string[]) => {
    const allSel = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSel ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };

  const handleRemove = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleBulkRemove = () => {
    setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  return {
    records, stats, selectedDate, setSelectedDate,
    selectedIds, activeDropdown, setActiveDropdown,
    sortKey, sortDir, currentPage, setCurrentPage,
    filters, handleFilterChange, handleSort,
    filtered, paginated, ITEMS_PER_PAGE,
    toggleSelectRow, toggleSelectAll, handleRemove, handleBulkRemove,
  };
}
