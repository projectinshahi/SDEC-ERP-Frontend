'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  UserPlus,
  Search,
  Download,
  Plus,
  X,
  User,
  Mail,
  Calendar,
  Briefcase,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Phone,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { KPIStatCard } from '@/components/hr/KPIStatCard';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type ApiEmployee,
} from '@/lib/api/hr';
import { fetchRolesApi } from '@/lib/api/roles';

/* ── Status helpers ─────────────────────────────────────────────────────── */

type DisplayStatus = 'Active' | 'On Leave' | 'Inactive';

function toDisplay(status: string): DisplayStatus {
  if (status === 'active') return 'Active';
  if (status === 'on_leave' || status === 'on leave') return 'On Leave';
  return 'Inactive';
}

function toDbStatus(display: DisplayStatus): string {
  if (display === 'Active') return 'active';
  if (display === 'On Leave') return 'on_leave';
  return 'inactive';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return dateStr ?? '';
  }
}

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Role {
  id: number;
  name: string;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function EmployeesPage() {
  /* ── Data state ────────────────────────────────────────────────────────── */
  const [employees, setEmployees]       = useState<ApiEmployee[]>([]);
  const [roles, setRoles]               = useState<Role[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  /* ── Filter / pagination state ─────────────────────────────────────────── */
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedDept, setSelectedDept]     = useState('All');
  const [selectedRole, setSelectedRole]     = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage]       = useState(1);
  const [selectedIds, setSelectedIds]       = useState<string[]>([]);

  /* ── Detail modal ──────────────────────────────────────────────────────── */
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployee | null>(null);

  /* ── Drawer / form state ────────────────────────────────────────────────── */
  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);
  const [isEditMode, setIsEditMode]       = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);

  const [formId, setFormId]                       = useState('');
  const [formName, setFormName]                   = useState('');
  const [formEmail, setFormEmail]                 = useState('');
  const [formRole, setFormRole]                   = useState('');           // system role

  const [formDesignation, setFormDesignation]     = useState('');           // job title
  const [formPhone, setFormPhone]                 = useState('');
  const [formSalary, setFormSalary]               = useState('');
  const [formStatus, setFormStatus]               = useState<DisplayStatus>('Active');
  const [formJoinDate, setFormJoinDate]           = useState('');

  const itemsPerPage = 8;

  /* ── Load data ─────────────────────────────────────────────────────────── */
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    // Also load roles for the form dropdown
    fetchRolesApi()
      .then((data) => setRoles(data))
      .catch(() => setRoles([]));
  }, [loadEmployees]);

  /* ── Derived filter options ─────────────────────────────────────────────── */
  const departments = useMemo(
    () => ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))],
    [employees]
  );

  const designations = useMemo(
    () => ['All', ...Array.from(new Set(employees.map((e) => e.designation).filter(Boolean)))],
    [employees]
  );

  /* ── KPI stats ──────────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total      = employees.length;
    const active     = employees.filter((e) => e.employment_status === 'active').length;
    const leave      = employees.filter((e) => e.employment_status === 'on_leave' || e.employment_status === 'on leave').length;
    const thisYear   = new Date().getFullYear();
    const newJoiners = employees.filter((e) => {
      try { return new Date(e.join_date).getFullYear() === thisYear; } catch { return false; }
    }).length;
    return { total, active, leave, newJoiners };
  }, [employees]);

  /* ── Filtered + paginated employees ──────────────────────────────────────── */
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        e.name?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q);
      const matchesDept   = selectedDept   === 'All' || e.department  === selectedDept;
      const matchesRole   = selectedRole   === 'All' || e.designation === selectedRole;
      const matchesStatus = selectedStatus === 'All' || toDisplay(e.employment_status) === selectedStatus;
      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedRole, selectedStatus]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  /* ── Selection helpers ──────────────────────────────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedEmployees.map((e) => String(e.id));
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  /* ── Drawer helpers ─────────────────────────────────────────────────────── */
  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormEmail('');
    setFormRole(roles[0]?.name ?? '');
    setFormDesignation('');
    setFormPhone('');
    setFormSalary('');
    setFormStatus('Active');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setSaveError(null);
  };

  const handleOpenAddDrawer = () => {
    setIsEditMode(false);
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (emp: ApiEmployee) => {
    setIsEditMode(true);
    setFormId(String(emp.id));
    setFormName(emp.name ?? '');
    setFormEmail(emp.email ?? '');
    setFormRole(emp.role ?? roles[0]?.name ?? '');
    setFormDesignation(emp.designation ?? '');
    setFormPhone(emp.phone ?? '');
    setFormSalary(emp.salary != null ? String(emp.salary) : '');
    setFormStatus(toDisplay(emp.employment_status));
    setFormJoinDate(formatDate(emp.join_date));
    setSaveError(null);
    setIsDrawerOpen(true);
  };

  /* ── CRUD handlers ──────────────────────────────────────────────────────── */
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formDesignation || !formJoinDate) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      if (isEditMode) {
        await updateEmployee(Number(formId), {
          name:              formName,
          email:             formEmail,
          role:              formRole,
          designation:       formDesignation,
          phone:             formPhone || undefined,
          salary:            formSalary ? Number(formSalary) : undefined,
          employment_status: toDbStatus(formStatus),
        });
      } else {
        await createEmployee({
          name:              formName,
          email:             formEmail,
          role:              formRole,
          designation:       formDesignation,
          phone:             formPhone || undefined,
          salary:            formSalary ? Number(formSalary) : undefined,
          join_date:         formJoinDate,
          employment_status: toDbStatus(formStatus),
        });
      }
      setIsDrawerOpen(false);
      await loadEmployees();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (emp: ApiEmployee) => {
    try {
      await deleteEmployee(emp.id);
      setSelectedIds((prev) => prev.filter((item) => item !== String(emp.id)));
      await loadEmployees();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to remove employee');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    const toDelete = employees.filter((e) => selectedIds.includes(String(e.id)));
    try {
      await Promise.all(toDelete.map((e) => deleteEmployee(e.id)));
      setSelectedIds([]);
      await loadEmployees();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to remove selected employees');
    }
  };

  /* ── Loading / error screens ──────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-4">
          <X size={22} />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Failed to load employees</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error}</p>
        <button
          onClick={loadEmployees}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8 relative">
      {/* 1. Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 mb-3">
            Workforce Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Workforce Employees
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Manage employee records, profiles, roles, and operational status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            onClick={handleOpenAddDrawer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-500/10"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* 2. KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPIStatCard label="Total Employees"  value={kpis.total}      subtitle="Registered staff"     icon={Users}       variant="indigo"  />
        <KPIStatCard label="Active Employees" value={kpis.active}     subtitle="Currently working"    icon={UserCheck}   variant="emerald" />
        <KPIStatCard label="On Leave"         value={kpis.leave}      subtitle="Out of office"        icon={CalendarDays} variant="amber"  />
        <KPIStatCard label="New Joiners"      value={kpis.newJoiners} subtitle="Onboarded this year"  icon={UserPlus}    variant="blue"    />
      </div>

      {/* 3. Filter Toolbar */}
      <Card className="overflow-hidden border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl">
        <div className="p-5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, email, or employee ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
            >
              <option value="All">All Departments</option>
              {departments.filter((d) => d !== 'All').map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
            >
              <option value="All">All Roles</option>
              {designations.filter((r) => r !== 'All').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Employee Table */}
      <Card className="overflow-hidden border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col h-full">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/80 text-[10px] font-bold text-gray-400 dark:text-gray-550 bg-gray-50/20 dark:bg-gray-900/10 uppercase tracking-widest">
                <th className="py-4 px-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedEmployees.length > 0 && paginatedEmployees.every((emp) => selectedIds.includes(String(emp.id)))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-750 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </th>
                <th className="py-4 px-4 font-semibold">Employee</th>
                <th className="py-4 px-4 font-semibold">Employee ID</th>
                <th className="py-4 px-4 font-semibold">Department</th>
                <th className="py-4 px-4 font-semibold">Role</th>
                <th className="py-4 px-4 font-semibold">Email</th>
                <th className="py-4 px-4 font-semibold">Status</th>
                <th className="py-4 px-4 font-semibold">Join Date</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700/60">
                        <Users size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4">No employees found</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                        Try modifying your keywords or removing filters to retrieve results.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const empIdStr   = String(emp.id);
                  const isSelected = selectedIds.includes(empIdStr);
                  const displayStatus = toDisplay(emp.employment_status);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors ${isSelected ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}`}
                    >
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(empIdStr)}
                          className="rounded border-gray-300 dark:border-gray-750 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                            {(emp.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                            {emp.name}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono font-medium text-gray-600 dark:text-gray-450 tabular-nums">
                        {emp.employee_code}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {emp.department}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {emp.designation}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {emp.email}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          displayStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
                            : displayStatus === 'On Leave'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border-rose-100 dark:border-rose-900/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            displayStatus === 'Active' ? 'bg-emerald-500' : displayStatus === 'On Leave' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono font-medium text-gray-600 dark:text-gray-450 tabular-nums">
                        {formatDate(emp.join_date)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            title="View Profile"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditDrawer(emp)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleArchive(emp)}
                            title="Archive"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-4 space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No matching records found.</div>
          ) : (
            paginatedEmployees.map((emp) => {
              const empIdStr = String(emp.id);
              const displayStatus = toDisplay(emp.employment_status);
              return (
                <div key={emp.id} className="rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 p-4 space-y-3 relative">
                  <div className="absolute right-3 top-3 flex items-center gap-0.5">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      title="View Profile"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEditDrawer(emp)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleArchive(emp)}
                      title="Archive"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600">
                      {(emp.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{emp.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{emp.employee_code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-gray-800/80 pt-3">
                    <div>
                      <span className="block text-gray-400 dark:text-gray-500 font-medium">Department</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">{emp.department}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 dark:text-gray-500 font-medium">Role</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">{emp.designation}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-3 flex-wrap gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-450 font-medium truncate">{emp.email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : displayStatus === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Pagination & bulk controls */}
        {filteredEmployees.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/20 dark:bg-gray-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Showing {Math.min(filteredEmployees.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
                {Math.min(filteredEmployees.length, currentPage * itemsPerPage)} of {filteredEmployees.length} entries
              </span>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkArchive}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-lg transition border border-rose-100 dark:border-rose-900/30"
                >
                  <Trash2 size={12} />
                  <span>Archive Selected ({selectedIds.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Slide-Over Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => !isSaving && setIsDrawerOpen(false)}
            />

            <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-850 shadow-2xl p-6 space-y-6">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-850 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isEditMode ? 'Edit Employee Details' : 'Onboard New Employee'}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Input information below to configure the employee card profile.
                      </p>
                    </div>
                    <button
                      onClick={() => !isSaving && setIsDrawerOpen(false)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveEmployee} className="flex-1 space-y-5">

                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Jaseem K M"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Email Address</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="e.g. jaseem@shahi.in"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* System Role */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">System Role</label>
                      <div className="relative">
                        <ShieldCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100 appearance-none"
                        >
                          <option value="">Select role…</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Designation</label>
                      <div className="relative">
                        <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={formDesignation}
                          onChange={(e) => setFormDesignation(e.target.value)}
                          placeholder="e.g. Frontend Engineer"
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Phone + Salary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="+91 9876543210"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Salary (₹)</label>
                        <div className="relative">
                          <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            min={0}
                            value={formSalary}
                            onChange={(e) => setFormSalary(e.target.value)}
                            placeholder="e.g. 50000"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status + Join Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Operational Status</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as DisplayStatus)}
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Onboarding Date</label>
                        <div className="relative">
                          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="date"
                            required
                            value={formJoinDate}
                            onChange={(e) => setFormJoinDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save error */}
                    {saveError && (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-2.5">
                        {saveError}
                      </p>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-850 mt-6">
                      <button
                        type="button"
                        onClick={() => !isSaving && setIsDrawerOpen(false)}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-70 disabled:cursor-wait inline-flex items-center justify-center gap-2"
                      >
                        {isSaving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Profile Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />

          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl z-10 transition-all duration-300">
            {/* Accent banner */}
            <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute right-4 top-4 p-1.5 bg-black/20 hover:bg-black/35 rounded-full text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 relative">
              <div className="flex justify-between items-end -mt-10 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-950 p-1 border-4 border-white dark:border-gray-900 shadow-md">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 flex items-center justify-center font-black text-2xl text-blue-600 dark:text-blue-400">
                    {(selectedEmployee.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  toDisplay(selectedEmployee.employment_status) === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : toDisplay(selectedEmployee.employment_status) === 'On Leave'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {toDisplay(selectedEmployee.employment_status)}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{selectedEmployee.name}</h2>
                  <p className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 mt-2">{selectedEmployee.employee_code}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 dark:border-gray-800/80 py-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Department</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.department}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Designation</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.designation}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Email Address</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Onboarding Date</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(selectedEmployee.join_date)}</p>
                  </div>
                  {selectedEmployee.phone && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Phone</span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.phone}</p>
                    </div>
                  )}
                  {selectedEmployee.salary != null && selectedEmployee.salary > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Salary</span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        ₹{Number(selectedEmployee.salary).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => { handleOpenEditDrawer(selectedEmployee); setSelectedEmployee(null); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Edit size={13} /><span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="inline-flex items-center px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
                  >
                    Close Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
