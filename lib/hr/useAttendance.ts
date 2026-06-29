import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceSortKey,
  SortDirection,
  AttendanceStatus,
} from './attendance.types';
import { computeAttendanceStats, TODAY } from './attendance.mock';
import {
  fetchAttendance,
  saveAttendance,
  deleteAttendance,
  ApiAttendanceRecord,
} from '@/lib/api/hr-attendance';
import { fetchEmployees, ApiEmployee } from '@/lib/api/hr';
import { AttendanceFormValues } from '@/components/hr/attendance/AttendanceActionPanel';

const ITEMS_PER_PAGE = 10;

/* ── Backend → Frontend record adapter ─────────────────────────────────────── */

function formatWorkHours(wh: number | null | undefined): string | null {
  if (wh == null || wh <= 0) return null;
  const totalMins = Math.round(wh * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function mapStatus(raw: string | null | undefined): AttendanceStatus {
  switch (raw) {
    case 'present': return 'Present';
    case 'late': return 'Late';
    case 'late_after_lunch': return 'Late After Lunch';
    case 'leave_full_day': return 'Full Day Leave';
    case 'leave_half_day': return 'Half Day Leave';
    case 'absent': return 'Absent';
    default: return 'Absent';
  }
}

function adaptRecord(r: ApiAttendanceRecord): AttendanceRecord {
  // Prisma $queryRawUnsafe returns Postgres NUMERIC as string — parse it first
  const workHoursNum = r.work_hours != null ? parseFloat(String(r.work_hours)) : null;
  return {
    id: String(r.id),
    employeeId: r.employee_code ?? '',
    name: r.name ?? '',
    department: r.department ?? '',
    role: r.designation ?? '',
    date: r.date ? r.date.split('T')[0] : TODAY,
    morningIn: r.check_in ?? null,
    lunchOut: r.lunch_out ?? null,
    lunchIn: r.lunch_in ?? null,
    checkOut: r.check_out ?? null,
    totalHours: formatWorkHours(workHoursNum),
    status: mapStatus(r.status),
    overtime: null,
    note: r.notes ?? undefined,
    leaveType: r.leave_type ?? null,
  };
}

/** "09:30" (24h) → "09:30 AM" / "14:15" → "02:15 PM" */
function to12h(val: string): string {
  if (!val) return '';
  const [hStr, mStr] = val.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const meridiem = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${meridiem}`;
}

/* ── Hook ───────────────────────────────────────────────────────────────────── */

export function useAttendance() {
  /* ── Remote data ─────────────────────────────────────────────────────────── */
  const [rawRecords, setRawRecords] = useState<ApiAttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Form save state ─────────────────────────────────────────────────────── */
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Modal / edit state ──────────────────────────────────────────────────── */
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiAttendanceRecord | null>(null);

  /* ── UI state ────────────────────────────────────────────────────────────── */
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<AttendanceSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '', department: 'All', status: 'All', date: TODAY,
  });

  /* ── Load data ───────────────────────────────────────────────────────────── */
  const loadAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [att, emps] = await Promise.all([fetchAttendance(), fetchEmployees()]);
      setRawRecords(att);
      setEmployees(emps);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  /* ── Auto-dismiss success message after 3s ───────────────────────────────── */
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  /* ── Adapted records ─────────────────────────────────────────────────────── */
  const records = useMemo(() => rawRecords.map(adaptRecord), [rawRecords]);

  /* ── Modal helpers ────────────────────────────────────────────────────────── */
  const openEntryModal = () => {
    setEditRecord(null);
    setIsEntryModalOpen(true);
  };

  const openEditModal = (record: ApiAttendanceRecord) => {
    setEditRecord(record);
    setIsEntryModalOpen(true);
  };

  const closeEntryModal = () => {
    setIsEntryModalOpen(false);
    setEditRecord(null);
    setSaveError(null);
    setSuccessMsg(null);
  };

  /* ── Form save handler ───────────────────────────────────────────────────── */
  const handleFormSave = async (values: AttendanceFormValues) => {
    if (!values.employeeId || !values.date) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveAttendance({
        employee_id: values.employeeId,
        date: values.date,
        check_in: values.checkIn ? to12h(values.checkIn) : null,
        lunch_out: values.lunchOut ? to12h(values.lunchOut) : null,
        lunch_in: values.lunchIn ? to12h(values.lunchIn) : null,
        check_out: values.checkOut ? to12h(values.checkOut) : null,
        leave_type: values.leaveType,
        notes: values.notes,
      });
      setSuccessMsg('Attendance saved successfully');
      await loadAttendance();
      // Auto-close modal after successful save
      setTimeout(() => closeEntryModal(), 1500);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Filter & sort ───────────────────────────────────────────────────────── */
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

  const stats = useMemo(() => computeAttendanceStats(records, employees.length, selectedDate), [records, employees, selectedDate]);

  /* ── Selection ───────────────────────────────────────────────────────────── */
  const toggleSelectRow = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = (pageIds: string[]) => {
    const allSel = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSel ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };

  /* ── Remove (API integration) ────────────────────────────────────────────── */
  const handleRemove = async (id: string) => {
    console.log(`[useAttendance] Clicked record ID: ${id}`);
    try {
      setError(null);
      await deleteAttendance(Number(id));
      await loadAttendance();
    } catch (err: any) {
      console.error(`[useAttendance] Delete error:`, err);
      setError(err?.message ?? 'Failed to delete attendance record');
    }
  };

  const handleBulkRemove = async () => {
    console.log(`[useAttendance] Bulk removing record IDs:`, selectedIds);
    try {
      setError(null);
      await Promise.all(selectedIds.map(id => deleteAttendance(Number(id))));
      setSelectedIds([]);
      await loadAttendance();
    } catch (err: any) {
      console.error(`[useAttendance] Bulk delete error:`, err);
      setError(err?.message ?? 'Failed to delete some attendance records');
    }
  };

  return {
    /* data */
    records, rawRecords, stats, employees,
    /* loading / error */
    isLoading, error,
    /* form save */
    isSaving, saveError, successMsg, handleFormSave,
    /* modal */
    isEntryModalOpen, editRecord, openEntryModal, openEditModal, closeEntryModal,
    /* date / ui */
    selectedDate, setSelectedDate,
    selectedIds,
    sortKey, sortDir, currentPage, setCurrentPage,
    filters, handleFilterChange, handleSort,
    filtered, paginated, ITEMS_PER_PAGE,
    toggleSelectRow, toggleSelectAll, handleRemove, handleBulkRemove,
    refresh: loadAttendance,
  };
}
