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
  fetchApprovedLeaves,
  attendanceYmd,
  ApiAttendanceRecord,
  ApiApprovedLeave,
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
    case 'half_day': return 'Half Day';
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
    // Calendar day of the record — normalised so a raw timestamp can never be
    // read as the previous day (which made saved attendance show as "Absent").
    date: attendanceYmd(r.date) ?? TODAY,
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

/**
 * DERIVED-ATTENDANCE overlay: apply an approved leave (covering the selected
 * date) onto a base record. `leaves` stays the source of truth — nothing is
 * written back. Full-day leave takes precedence over any punch (display work
 * hours = 0); half-day leave PRESERVES the working-half punches + actual hours.
 */
function applyLeaveOverlay(base: AttendanceRecord, leaves: ApiApprovedLeave[]): AttendanceRecord {
  // Resolve possibly-overlapping / duplicate approved leaves DETERMINISTICALLY
  // (independent of row order), defending against legacy bad data:
  //   • any full-day leave, OR both halves present → Full Day Leave
  //   • only first_half → First Half Leave; only second_half → Second Half Leave
  //   • a legacy half with no session → generic half (leaveHalf = null; no guess)
  //   • duplicate identical rows collapse naturally (boolean OR)
  const isHalf = (lv: ApiApprovedLeave) =>
    lv.half_period != null ||
    (typeof lv.leave_type === 'string' && lv.leave_type.includes('(Half Day)'));

  const anyFull = leaves.some((lv) => !isHalf(lv));
  const hasFirst = leaves.some((lv) => lv.half_period === 'first_half');
  const hasSecond = leaves.some((lv) => lv.half_period === 'second_half');

  if (anyFull || (hasFirst && hasSecond)) {
    return {
      ...base,
      status: 'Full Day Leave',
      leaveType: 'full_day',
      leaveHalf: null,
      isDerivedLeave: true,
      totalHours: null, // full-day leave → derived work hours = 0
    };
  }

  const leaveHalf: 'first_half' | 'second_half' | null = hasFirst
    ? 'first_half'
    : hasSecond
      ? 'second_half'
      : null; // legacy/unknown session (do not guess)

  return {
    ...base,
    status: 'Half Day Leave',
    leaveType: 'half_day',
    leaveHalf,
    isDerivedLeave: true,
    // Working-half punches + actual work hours are preserved from `base`.
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
  // Date-tagged so the overlay only ever applies leave fetched for the CURRENT
  // selected date (prevents a stale previous-date result flashing during a rapid
  // date switch, even for a single render).
  const [approvedLeaves, setApprovedLeaves] = useState<{ date: string; items: ApiApprovedLeave[] }>(
    { date: '', items: [] },
  );
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

  /* ── Approved-leave overlay for the SELECTED date (derived attendance) ─────── */
  // Re-fetches whenever the selected date changes, so approved leave reflects the
  // chosen date (incl. future dates) and any approve/reject/delete shows up live.
  useEffect(() => {
    let cancelled = false;
    const forDate = selectedDate;
    fetchApprovedLeaves(forDate)
      .then((data) => { if (!cancelled) setApprovedLeaves({ date: forDate, items: data }); })
      .catch(() => { if (!cancelled) setApprovedLeaves({ date: forDate, items: [] }); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  /* ── Auto-dismiss success message after 3s ───────────────────────────────── */
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  /* ── Adapted records & Option B Merging ──────────────────────────────────── */
  const adaptedRecords = useMemo(() => rawRecords.map(adaptRecord), [rawRecords]);

  /* Approved leaves covering the selected date, GROUPED by employee id (an
   * employee may have >1 overlapping approved leave in legacy data). Only applied
   * when the fetched data belongs to the current selectedDate (stale-guard). */
  const leaveByEmployee = useMemo(() => {
    const m = new Map<number, ApiApprovedLeave[]>();
    if (approvedLeaves.date !== selectedDate) return m;
    for (const lv of approvedLeaves.items) {
      const arr = m.get(lv.employee_id);
      if (arr) arr.push(lv);
      else m.set(lv.employee_id, [lv]);
    }
    return m;
  }, [approvedLeaves, selectedDate]);

  const records = useMemo(() => {
    return employees.map((emp) => {
      // Real attendance record for this employee on the selected date, if any.
      const realRecord = adaptedRecords.find(
        (r) => r.employeeId === emp.employee_code && r.date === selectedDate
      );
      // Base = the real record, else a virtual "Absent" row.
      const base: AttendanceRecord = realRecord ?? {
        id: `virtual-${emp.id}`,
        employeeId: emp.employee_code ?? '',
        name: emp.name ?? '',
        department: emp.department ?? '',
        role: emp.designation ?? '',
        date: selectedDate,
        morningIn: null,
        lunchOut: null,
        lunchIn: null,
        checkOut: null,
        totalHours: null,
        status: 'Absent',
        overtime: null,
        note: undefined,
        leaveType: null,
      };
      // Approved leave covering the selected date takes precedence over Absent.
      const leaves = leaveByEmployee.get(emp.id);
      return leaves && leaves.length ? applyLeaveOverlay(base, leaves) : base;
    });
  }, [employees, adaptedRecords, selectedDate, leaveByEmployee]);

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
    if (id.startsWith('virtual-')) return; // Virtual records don't exist in DB
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
    // Only delete real database records
    const realIds = selectedIds.filter(id => !id.startsWith('virtual-'));
    if (realIds.length === 0) {
      setSelectedIds([]);
      return;
    }
    console.log(`[useAttendance] Bulk removing record IDs:`, realIds);
    try {
      setError(null);
      await Promise.all(realIds.map(id => deleteAttendance(Number(id))));
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
