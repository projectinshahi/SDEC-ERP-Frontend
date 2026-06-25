'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  UserPlus,
  Search,
  Download,
  Plus,
  MoreVertical,
  X,
  User,
  Mail,
  Calendar,
  Briefcase,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { KPIStatCard } from '@/components/hr/KPIStatCard';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  role: string;
  email: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  joinDate: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', employeeId: 'EMP-2026-001', name: 'Jaseem K M', department: 'Management', role: 'Managing Director', email: 'jaseem@shahi.in', status: 'Active', joinDate: '2020-05-12' },
  { id: '2', employeeId: 'EMP-2026-002', name: 'Michal Davis', department: 'Development', role: 'Lead Architect', email: 'michal.d@shahi.in', status: 'Active', joinDate: '2021-08-19' },
  { id: '3', employeeId: 'EMP-2026-003', name: 'Dimah Al-Sabah', department: 'Development', role: 'Frontend Engineer', email: 'dimah@shahi.in', status: 'Active', joinDate: '2022-11-05' },
  { id: '4', employeeId: 'EMP-2026-004', name: 'Radha Sharma', department: 'Design', role: 'UI/UX Designer', email: 'radha.s@shahi.in', status: 'On Leave', joinDate: '2023-02-14' },
  { id: '5', employeeId: 'EMP-2026-005', name: 'Sinan Tariq', department: 'Development', role: 'Software Engineer', email: 'sinan@shahi.in', status: 'Inactive', joinDate: '2024-01-10' },
  { id: '6', employeeId: 'EMP-2026-006', name: 'Hiba Fathima', department: 'HR', role: 'HR Generalist', email: 'hiba@shahi.in', status: 'Active', joinDate: '2023-06-20' },
  { id: '7', employeeId: 'EMP-2026-007', name: 'Nivad Chandran', department: 'Development', role: 'Fullstack Dev', email: 'nivad.c@shahi.in', status: 'Active', joinDate: '2022-09-01' },
  { id: '8', employeeId: 'EMP-2026-008', name: 'Salman Faris', department: 'Development', role: 'Backend Engineer', email: 'salman@shahi.in', status: 'Active', joinDate: '2024-03-15' },
  { id: '9', employeeId: 'EMP-2026-009', name: 'Ananya Nair', department: 'HR', role: 'Recruiting Lead', email: 'ananya@shahi.in', status: 'Active', joinDate: '2021-04-10' },
  { id: '10', employeeId: 'EMP-2026-010', name: 'Rahul Varma', department: 'Sales', role: 'Sales Executive', email: 'rahul.v@shahi.in', status: 'Active', joinDate: '2022-03-24' },
  { id: '11', employeeId: 'EMP-2026-011', name: 'Sneha Patel', department: 'Design', role: 'Product Designer', email: 'sneha@shahi.in', status: 'Active', joinDate: '2023-10-18' },
  { id: '12', employeeId: 'EMP-2026-012', name: 'Aswin Kumar', department: 'Sales', role: 'BDE Manager', email: 'aswin@shahi.in', status: 'On Leave', joinDate: '2022-07-15' },
  { id: '13', employeeId: 'EMP-2026-013', name: 'Emily Watson', department: 'Management', role: 'Operations Chief', email: 'emily@shahi.in', status: 'Active', joinDate: '2020-01-20' },
  { id: '14', employeeId: 'EMP-2026-014', name: 'Karthik Raja', department: 'Development', role: 'DevOps Specialist', email: 'karthik@shahi.in', status: 'Active', joinDate: '2023-05-14' },
  { id: '15', employeeId: 'EMP-2026-015', name: 'Maria Joseph', department: 'Sales', role: 'Account Manager', email: 'maria@shahi.in', status: 'Inactive', joinDate: '2024-02-28' },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Detail Modal State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState('Development');
  const [formRole, setFormRole] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'On Leave' | 'Inactive'>('Active');
  const [formJoinDate, setFormJoinDate] = useState('');

  const itemsPerPage = 8;

  // Filter criteria options
  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department)))], [employees]);
  const roles = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.role)))], [employees]);

  // Derived KPI Stats
  const kpis = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'Active').length;
    const leave = employees.filter(e => e.status === 'On Leave').length;
    const newJoiners = employees.filter(e => {
      const year = new Date(e.joinDate).getFullYear();
      return year === 2026 || year === 2024; // Representative of recent joiners in mock scope
    }).length;

    return { total, active, leave, newJoiners };
  }, [employees]);

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'All' || e.department === selectedDept;
      const matchesRole = selectedRole === 'All' || e.role === selectedRole;
      const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus;

      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedRole, selectedStatus]);

  // Pagination
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedEmployees.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleOpenAddDrawer = () => {
    setIsEditMode(false);
    setFormId('');
    setFormName('');
    setFormEmail('');
    setFormDept('Development');
    setFormRole('');
    setFormStatus('Active');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (emp: Employee) => {
    setIsEditMode(true);
    setFormId(emp.id);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormDept(emp.department);
    setFormRole(emp.role);
    setFormStatus(emp.status);
    setFormJoinDate(emp.joinDate);
    setIsDrawerOpen(true);
    setActiveDropdownId(null);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formRole || !formJoinDate) return;

    if (isEditMode) {
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === formId
            ? { ...emp, name: formName, email: formEmail, department: formDept, role: formRole, status: formStatus, joinDate: formJoinDate }
            : emp
        )
      );
    } else {
      const nextId = (employees.length + 1).toString();
      const codeNumber = (employees.length + 1).toString().padStart(3, '0');
      const newEmp: Employee = {
        id: nextId,
        employeeId: `EMP-2026-${codeNumber}`,
        name: formName,
        email: formEmail,
        department: formDept,
        role: formRole,
        status: formStatus,
        joinDate: formJoinDate,
      };
      setEmployees(prev => [newEmp, ...prev]);
    }
    setIsDrawerOpen(false);
  };

  const handleArchive = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    setSelectedIds(prev => prev.filter(item => item !== id));
    setActiveDropdownId(null);
  };

  const handleBulkArchive = () => {
    if (selectedIds.length === 0) return;
    setEmployees(prev => prev.filter(emp => !selectedIds.includes(emp.id)));
    setSelectedIds([]);
  };

  return (
    <div className="space-y-8 relative">
      {/* 1. Header Section */}
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

      {/* 2. KPI row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPIStatCard
          label="Total Employees"
          value={kpis.total}
          subtitle="Registered staff"
          icon={Users}
          variant="indigo"
        />
        <KPIStatCard
          label="Active Employees"
          value={kpis.active}
          subtitle="Currently working"
          icon={UserCheck}
          variant="emerald"
        />
        <KPIStatCard
          label="On Leave"
          value={kpis.leave}
          subtitle="Out of office"
          icon={CalendarDays}
          variant="amber"
        />
        <KPIStatCard
          label="New Joiners"
          value={kpis.newJoiners}
          subtitle="Onboarded recently"
          icon={UserPlus}
          variant="blue"
        />
      </div>

      {/* 3. Filter Toolbar */}
      <Card className="overflow-hidden border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl">
        <div className="p-5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or employee ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
            >
              <option value="All">All Roles</option>
              {roles.filter(r => r !== 'All').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
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

      {/* 4. Employee Table Container */}
      <Card className="overflow-hidden border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col h-full">
        {/* Table layout visible on MD screens & above */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/80 text-[10px] font-bold text-gray-400 dark:text-gray-550 bg-gray-50/20 dark:bg-gray-900/10 uppercase tracking-widest">
                <th className="py-4 px-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedEmployees.length > 0 && paginatedEmployees.every(emp => selectedIds.includes(emp.id))}
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
                  const isSelected = selectedIds.includes(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors ${
                        isSelected ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(emp.id)}
                          className="rounded border-gray-300 dark:border-gray-750 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                              {emp.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono font-medium text-gray-600 dark:text-gray-450 tabular-nums">
                        {emp.employeeId}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {emp.department}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {emp.role}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {emp.email}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            emp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
                              : emp.status === 'On Leave'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border-amber-100 dark:border-amber-900/30'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border-rose-100 dark:border-rose-900/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            emp.status === 'Active' ? 'bg-emerald-500' : emp.status === 'On Leave' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono font-medium text-gray-600 dark:text-gray-450 tabular-nums">
                        {emp.joinDate}
                      </td>
                      <td className="py-4 px-6 text-right relative">
                        <div className="inline-block text-left">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === emp.id ? null : emp.id)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg transition"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeDropdownId === emp.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className="absolute right-6 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-750 rounded-xl shadow-xl z-40 py-1.5 overflow-hidden">
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition flex items-center gap-2"
                                >
                                  <Eye size={13} />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditDrawer(emp)}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition flex items-center gap-2"
                                >
                                  <Edit size={13} />
                                  <span>Edit</span>
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700/60 my-1" />
                                <button
                                  onClick={() => handleArchive(emp.id)}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center gap-2"
                                >
                                  <Trash2 size={13} />
                                  <span>Archive</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards view visible on smaller displays */}
        <div className="md:hidden p-4 space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No matching records found.
            </div>
          ) : (
            paginatedEmployees.map(emp => (
              <div
                key={emp.id}
                className="rounded-2xl border border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 p-4 space-y-3 relative"
              >
                <div className="absolute right-3 top-3">
                  <button
                    onClick={() => setActiveDropdownId(activeDropdownId === emp.id ? null : emp.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeDropdownId === emp.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveDropdownId(null)} />
                      <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-150 rounded-xl shadow-lg z-40 py-1">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setActiveDropdownId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => handleOpenEditDrawer(emp)}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchive(emp.id)}
                          className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                        >
                          Archive
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/10 flex items-center justify-center font-bold text-sm text-blue-600">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{emp.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{emp.employeeId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-gray-800/80 pt-3">
                  <div>
                    <span className="block text-gray-400 dark:text-gray-500 font-medium">Department</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">{emp.department}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 dark:text-gray-500 font-medium">Role</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">{emp.role}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-3 flex-wrap gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-450 font-medium truncate">{emp.email}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : emp.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {emp.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 5. Footer Pagination & Bulk controls */}
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
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Slide-Over Onboarding / Onboarding Form Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsDrawerOpen(false)}
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
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Onboarding Form */}
                  <form onSubmit={handleSaveEmployee} className="flex-1 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name</label>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Department</label>
                        <select
                          value={formDept}
                          onChange={(e) => setFormDept(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                        >
                          <option value="Management">Management</option>
                          <option value="Development">Development</option>
                          <option value="Design">Design</option>
                          <option value="HR">HR</option>
                          <option value="Sales">Sales</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Role Designation</label>
                        <div className="relative">
                          <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            required
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            placeholder="e.g. Frontend Engineer"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Operational Status</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as any)}
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

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-850 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-205 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Profile Detail Overlay Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
          {/* Blur backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />

          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl z-10 transition-all duration-300">
            {/* Header / Accent Gradient Banner */}
            <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute right-4 top-4 p-1.5 bg-black/20 hover:bg-black/35 rounded-full text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Avatar block overlay */}
            <div className="px-6 pb-6 relative">
              <div className="flex justify-between items-end -mt-10 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-950 p-1 border-4 border-white dark:border-gray-900 shadow-md">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 flex items-center justify-center font-black text-2xl text-blue-600 dark:text-blue-400">
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    selectedEmployee.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : selectedEmployee.status === 'On Leave'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}
                >
                  {selectedEmployee.status}
                </span>
              </div>

              {/* General Details */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{selectedEmployee.name}</h2>
                  <p className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 mt-2">{selectedEmployee.employeeId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 dark:border-gray-800/80 py-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Department</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.department}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Designation</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.role}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Email Address</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-450 dark:text-gray-500 tracking-wider">Onboarding Date</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedEmployee.joinDate}</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => {
                      handleOpenEditDrawer(selectedEmployee);
                      setSelectedEmployee(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-250 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Edit size={13} />
                    <span>Edit Profile</span>
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
