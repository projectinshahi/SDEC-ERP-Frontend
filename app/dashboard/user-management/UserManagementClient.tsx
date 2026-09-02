'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { RoleTable } from '@/components/user-management/RoleTable';
import { AddUserModal } from '@/components/user-management/AddUserModal';
import { CreateRoleModal } from '@/components/user-management/CreateRoleModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import {
  Plus, Users, Shield, AlertTriangle, UserCheck, UserX, ShieldCheck, TrendingUp,
  Code2, UserPlus, Search, Download, Pencil, Trash2, RotateCw, X,
} from 'lucide-react';
import type { User, Role, UserFormData } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { fetchUsersDirectory, createUserApi, updateUserApi, deleteUserApi } from '@/lib/api/users';
import { fetchRolesApi, fetchRolesPicklist, deleteRoleApi } from '@/lib/api/roles';
import { usePermissions } from '@/lib/hooks/usePermissions';

type TabType = 'users' | 'roles';

// ── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-fuchsia-500',
];
function avatarOf(name: string) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { initials, color: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] };
}
function classifyRoles(roles: string[]) {
  const j = roles.join(' ').toLowerCase();
  return { admin: /admin/.test(j), sales: /sales/.test(j), developer: /develop|dev\b/.test(j) };
}
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const ROLE_BADGE_COLORS = [
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
];
function roleBadgeColor(role: string) {
  let hash = 0;
  for (let i = 0; i < role.length; i++) hash = role.charCodeAt(i) + ((hash << 5) - hash);
  return ROLE_BADGE_COLORS[Math.abs(hash) % ROLE_BADGE_COLORS.length];
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === 'active'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'inactive'
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={classNames('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize', cls)}>
      <span className={classNames('w-1.5 h-1.5 rounded-full', s === 'active' ? 'bg-emerald-500' : s === 'inactive' ? 'bg-slate-400' : 'bg-amber-500')} />
      {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600', indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600', slate: 'bg-slate-100 text-slate-500',
    amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3.5">
      <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', tones[tone])}>
        <Icon className="w-5.5 h-5.5" size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

/**
 * Standalone, Odoo-inspired User Management module. Live stat analytics, a modern
 * enterprise directory table with advanced filtering/sorting, plus the existing
 * role management — all backed by live database data (no mock/placeholder values).
 */
export function UserManagementClient() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  // STRICT per-tab visibility: the Users directory needs `user.read`, the Roles
  // matrix needs `role.read` (SuperAdmin bypasses both via usePermissions).
  const canViewUsers = hasPermission('user.read');
  const canViewRoles = hasPermission('role.read');
  const availableTabs = useMemo<TabType[]>(() => {
    const t: TabType[] = [];
    if (canViewUsers) t.push('users');
    if (canViewRoles) t.push('roles');
    return t;
  }, [canViewUsers, canViewRoles]);

  // Initialise on a tab the user can actually see (avoids a first-render flash of
  // the Users tab for a roles-only user before the correction effect runs).
  const [activeTab, setActiveTab] = useState<TabType>(canViewUsers ? 'users' : 'roles');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  // Slim role list (id+name) for the create/edit-user role dropdown — loads for
  // anyone (no role.read needed) so user creation isn't blocked.
  const [rolePicklist, setRolePicklist] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  // Roles tab has its OWN search term — sharing `search` with the Users tab would
  // make a user query silently filter the roles list when switching tabs.
  const [roleSearch, setRoleSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const loadUsers = async () => {
    setLoadError(null);
    try {
      const data = await fetchUsersDirectory();
      setUsers(data.map((u) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        roles: u.role ? u.role.split(',').map((r) => r.trim()).filter(Boolean) : [],
        status: String(u.status).toLowerCase() as 'active' | 'inactive',
        createdAt: u.createdAt ?? '',
      })));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load users from the database.');
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchRolesApi();
      setRoles(data.map((r: any) => ({
        id: String(r.id), name: r.name, description: r.description || '',
        permissions: Array.isArray(r.permissions) ? r.permissions : [], userCount: r.userCount || 0,
        users: Array.isArray(r.users) ? r.users : [],
      })));
    } catch {
      toast('Failed to sync roles with database', 'error');
    }
  };

  const loadRolePicklist = async () => {
    try {
      setRolePicklist(await fetchRolesPicklist());
    } catch {
      /* dropdown falls back to roles already present on users */
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([
        canViewUsers ? loadUsers() : Promise.resolve(),
        canViewRoles ? loadRoles() : Promise.resolve(),
        loadRolePicklist(),
      ]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewUsers, canViewRoles]);

  // Keep the active tab on something the user is allowed to see.
  useEffect(() => {
    if (availableTabs.length && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  // ── Live analytics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    let active = 0, inactive = 0, admins = 0, sales = 0, devs = 0, recent = 0;
    for (const u of users) {
      if (u.status === 'active') active++; else inactive++;
      const c = classifyRoles(u.roles);
      if (c.admin) admins++;
      if (c.sales) sales++;
      if (c.developer) devs++;
      if (u.createdAt && now - new Date(u.createdAt).getTime() <= 30 * DAY) recent++;
    }
    return { total: users.length, active, inactive, admins, sales, devs, recent };
  }, [users]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.roles.forEach((r) => set.add(r)));
    roles.forEach((r) => set.add(r.name));
    rolePicklist.forEach((r) => set.add(r.name));
    return Array.from(set).sort();
  }, [users, roles, rolePicklist]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const DAY = 86400000;
    const dateWindow: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    let rows = users.filter((u) => {
      const matchesSearch = !q || u.name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q) || u.roles.join(' ').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || u.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchesDate = dateFilter === 'ALL' || (!!u.createdAt
        && now - new Date(u.createdAt).getTime() <= (dateWindow[dateFilter] ?? 99999) * DAY);
      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortBy === 'oldest' ? at - bt : bt - at;
    });
    return rows;
  }, [users, search, roleFilter, statusFilter, dateFilter, sortBy]);

  // Roles tab list — filtered from the SAME `roles` state the table renders, so
  // there is no second data source. Partial + case-insensitive over the fields the
  // table shows (name, description). Empty term => the complete list.
  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      String(r.name ?? '').toLowerCase().includes(q) ||
      String(r.description ?? '').toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const activeFilterCount = (roleFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)
    + (dateFilter !== 'ALL' ? 1 : 0) + (search.trim() ? 1 : 0);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAddUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createUserApi(data);
      // The backend now reports the real email outcome — never claim "was emailed"
      // when the provider rejected the send (the temp password ONLY exists in that email).
      if (res?.emailSent === false) {
        toast(`User "${data.name}" created, but the welcome email could NOT be delivered. Check the email service configuration, then resend their credentials.`, 'warning');
      } else {
        toast(`User "${data.name}" created — a temporary password was emailed.`, 'success');
      }
      setIsUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast(err?.details?.message || err?.message || 'Failed to create user', 'error');
    } finally { setIsSubmitting(false); }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateUserApi(editingUser.id, data);
      toast(`User "${data.name}" updated.`, 'success');
      setIsUserModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      toast(err?.details?.message || err?.message || 'Failed to update user', 'error');
    } finally { setIsSubmitting(false); }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteUserApi(userToDelete.id);
      toast(`User "${userToDelete.name}" deleted.`, 'info');
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      toast(err?.details?.message || err?.message || 'Failed to delete user', 'error');
    } finally { setIsDeletingUser(false); }
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await deleteRoleApi(roleToDelete.id);
      toast('Role deleted successfully', 'success');
      setRoleToDelete(null);
      loadRoles();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete role', 'error');
    } finally { setIsDeletingRole(false); }
  };

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Roles', 'Status', 'Created Date'];
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.join(',')];
    for (const u of visibleUsers) {
      lines.push([u.name, u.email, u.roles.join(' | '), u.status, fmtDate(u.createdAt)].map((v) => cell(String(v))).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls = 'px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer';

  return (
    <PermissionPageGuard module="user">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'User Management' }]} />
      </div>

      {/* Header — distinct violet identity */}
      <div className="mb-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Standalone administration — users, roles, permissions and access control.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCsv} className="border border-slate-200">
            <Download size={16} /> Export CSV
          </Button>
          {activeTab === 'users' ? (
            <PermissionGuard require="user.create">
              <Button variant="primary" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                className="!bg-violet-600 hover:!bg-violet-700 !focus:ring-violet-500">
                <Plus size={18} /> Add User
              </Button>
            </PermissionGuard>
          ) : (
            <PermissionGuard require="role.create">
              <Button variant="primary" onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }}
                className="!bg-violet-600 hover:!bg-violet-700">
                <Plus size={18} /> Add Role
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      {/* Live analytics — directory stats only shown to users who can read it */}
      {canViewUsers && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-7">
          <StatCard label="Total Users" value={stats.total} icon={Users} tone="violet" />
          <StatCard label="Active" value={stats.active} icon={UserCheck} tone="emerald" />
          <StatCard label="Inactive" value={stats.inactive} icon={UserX} tone="slate" />
          <StatCard label="Administrators" value={stats.admins} icon={ShieldCheck} tone="indigo" />
          <StatCard label="Sales Users" value={stats.sales} icon={TrendingUp} tone="blue" />
          <StatCard label="Developers" value={stats.devs} icon={Code2} tone="amber" />
          <StatCard label="Recently Added" value={stats.recent} icon={UserPlus} tone="rose" />
        </div>
      )}

      {/* Tabs — only the tabs the user is permitted to see */}
      <div className="mb-5 border-b border-slate-200">
        <nav className="flex gap-7">
          {([['users', 'Users', Users, users.length], ['roles', 'Roles', Shield, roles.length]] as const)
            .filter(([id]) => availableTabs.includes(id))
            .map(([id, label, Icon, count]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={classNames('flex items-center gap-2 py-3.5 px-1 border-b-2 font-bold text-sm transition-colors',
                activeTab === id ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-700')}>
              <Icon size={18} /> {label}
              <span className={classNames('ml-1 py-0.5 px-2 rounded-full text-xs font-bold',
                activeTab === id ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500')}>{count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* No readable section: reached the page via a non-read user.* permission
          (e.g. user.create) but holds neither user.read nor role.read. */}
      {availableTabs.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100"><Shield size={24} /></div>
          <p className="text-sm font-bold text-slate-700">No accessible sections</p>
          <p className="text-xs text-slate-400">You don’t have permission to view users or roles. Contact an administrator if you need access.</p>
        </div>
      )}

      {activeTab === 'users' && canViewUsers && (
        <>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or role..."
                className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
              )}
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={classNames(selectCls, 'lg:max-w-[180px]')}>
              <option value="ALL">All Roles</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={selectCls}>
              <option value="ALL">Any Date</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>

          {/* Directory table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                <p className="text-slate-400 font-semibold text-xs mt-4">Loading directory…</p>
              </div>
            ) : loadError ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center"><AlertTriangle className="text-rose-500" size={22} /></div>
                <p className="text-sm font-semibold text-slate-700">{loadError}</p>
                <Button variant="secondary" size="sm" onClick={loadUsers}><RotateCw size={14} /> Retry</Button>
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100"><Users size={26} /></div>
                <p className="text-sm font-bold text-slate-700">{users.length === 0 ? 'No users yet' : 'No matching users'}</p>
                <p className="text-xs text-slate-400">{users.length === 0 ? 'Create your first user to get started.' : 'Try adjusting your search or filters.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['User', 'Email', 'Role', 'Status', 'Created Date', 'Actions'].map((h) => (
                        <th key={h} className={classNames('py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap', h === 'Actions' && 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleUsers.map((u) => {
                      const av = avatarOf(u.name);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className={classNames('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', av.color)}>{av.initials}</div>
                              <span className="font-semibold text-slate-900 whitespace-nowrap">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-slate-500">{u.email}</td>
                          <td className="py-3 px-5">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.length === 0 ? <span className="text-xs text-slate-400 italic">No role</span>
                                : u.roles.map((r) => (
                                  <span key={r} className={classNames('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border', roleBadgeColor(r))}>{r}</span>
                                ))}
                            </div>
                          </td>
                          <td className="py-3 px-5"><StatusPill status={u.status} /></td>
                          <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center justify-end gap-1">
                              <PermissionGuard require="user.update">
                                <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} title="Edit user"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"><Pencil size={15} /></button>
                              </PermissionGuard>
                              <PermissionGuard require="user.delete">
                                <button onClick={() => setUserToDelete(u)} title="Delete user"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 size={15} /></button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                  Showing {visibleUsers.length} of {users.length} user{users.length === 1 ? '' : 's'}
                  {activeFilterCount > 0 && ' (filtered)'}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'roles' && canViewRoles && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {isLoading ? (
            <div className="py-16 text-center"><div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-violet-600" /></div>
          ) : (
            <>
              {/* Role search — client-side over the loaded roles (same data the
                  table renders; no second source). Partial + case-insensitive. */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles by name or description..."
                    aria-label="Search roles"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  {roleSearch && (
                    <button
                      type="button"
                      onClick={() => setRoleSearch('')}
                      aria-label="Clear role search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {roleSearch.trim() && (
                  <span className="text-sm text-slate-500">
                    {filteredRoles.length} of {roles.length} role{roles.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {filteredRoles.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-medium text-slate-600">No roles match &ldquo;{roleSearch.trim()}&rdquo;</p>
                  <button type="button" onClick={() => setRoleSearch('')} className="mt-2 text-sm font-semibold text-violet-600 hover:underline">
                    Clear search
                  </button>
                </div>
              ) : (
                <RoleTable roles={filteredRoles} onEdit={(r) => { setEditingRole(r); setIsRoleModalOpen(true); }} onDelete={(id) => { const r = roles.find((x) => x.id === id); if (r) setRoleToDelete(r); }} />
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AddUserModal
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
        availableRoles={roleOptions}
        editUser={editingUser}
        isSubmitting={isSubmitting}
      />
      <CreateRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); }}
        onSubmitSuccess={loadRoles}
        roleToEdit={editingRole}
      />

      <Modal isOpen={!!userToDelete} onClose={() => !isDeletingUser && setUserToDelete(null)} title="Confirm Deletion" size="sm">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4"><AlertTriangle size={28} /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Delete User Account?</h3>
          <p className="text-slate-500 text-sm mb-6">Permanently delete <span className="font-semibold text-slate-800">"{userToDelete?.name}"</span>? This revokes all access immediately and cannot be undone.</p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleConfirmDeleteUser} isLoading={isDeletingUser}>Delete User</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!roleToDelete} onClose={() => !isDeletingRole && setRoleToDelete(null)} title="Confirm Deletion" size="sm">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4"><AlertTriangle size={28} /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Security Role?</h3>
          <p className="text-slate-500 text-sm mb-6">
            Permanently delete role <span className="font-semibold text-slate-800">"{roleToDelete?.name}"</span>?
            {roleToDelete?.userCount ? (
              <span className="block mt-4 p-3 rounded-lg border border-rose-100 bg-rose-50/50 text-rose-700 text-xs font-semibold">⚠️ Assigned to {roleToDelete.userCount} user{roleToDelete.userCount > 1 ? 's' : ''} — cannot be deleted.</span>
            ) : (
              <span className="block mt-4 p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-xs font-semibold">✓ Not assigned to any users.</span>
            )}
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setRoleToDelete(null)} disabled={isDeletingRole}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleConfirmDeleteRole} isLoading={isDeletingRole} disabled={!!roleToDelete?.userCount}>Delete Role</Button>
          </div>
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}
