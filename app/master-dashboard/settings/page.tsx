'use client';

import { useState } from 'react';
import {
  ShieldCheck, Users, KeyRound, ScrollText, LayoutGrid, UserCheck, UserX,
  FolderKanban, Activity, Lock, type LucideIcon,
} from 'lucide-react';
import { UserManagementClient } from '@/app/dashboard/user-management/UserManagementClient';
import { RoleManagementClient } from '@/app/dashboard/role-management/RoleManagementClient';
import { ChangePasswordCard } from '@/components/settings/ChangePasswordCard';
import { fetchMasterAudit } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, MiniStat, EmptyState,
} from '@/components/master/MasterKit';
import { Card, CardBody } from '@/components/Card';
import { classNames } from '@/lib/utils';

type Tab = 'system' | 'security' | 'users' | 'roles' | 'audit';

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'system', label: 'System', icon: LayoutGrid },
  { id: 'security', label: 'Account Security', icon: Lock },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'roles', label: 'Role Management', icon: KeyRound },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export default function MasterSettingsPage() {
  const [tab, setTab] = useState<Tab>('system');
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterAudit);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ModuleHeader
        icon={ShieldCheck}
        title="System Governance & Access"
        subtitle="Organization-wide access control, user provisioning, role assignments, and audit oversight."
        accent="bg-slate-800 dark:bg-slate-700"
        shadow="shadow-slate-500/20"
        onRefresh={reload}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* System overview */}
      {tab === 'system' && (
        status !== 'ready' || !data ? (
          <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MiniStat label="Total Users" value={data.stats.totalUsers} icon={Users} tone="indigo" />
              <MiniStat label="Active Users" value={data.stats.activeUsers} icon={UserCheck} tone="emerald" />
              <MiniStat label="Inactive Users" value={data.stats.inactiveUsers} icon={UserX} tone="rose" />
              <MiniStat label="Roles" value={data.stats.totalRoles} icon={KeyRound} tone="violet" />
              <MiniStat label="Projects" value={data.stats.totalProjects} icon={FolderKanban} tone="blue" />
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardBody className="p-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" /> Platform Configuration
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <ConfigRow label="Access tier" value="SuperAdmin (organization-wide)" />
                  <ConfigRow label="Identity model" value="Role-based access control (RBAC)" />
                  <ConfigRow label="Data scope" value="Live, organization-wide — never per-user" />
                  <ConfigRow label="Audit retention" value="Activity log (most recent 50 events shown)" />
                </dl>
              </CardBody>
            </Card>
          </div>
        )
      )}

      {/* Account security — change password */}
      {tab === 'security' && (
        <div className="py-2">
          <ChangePasswordCard />
        </div>
      )}

      {/* User management */}
      {tab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
          <UserManagementClient />
        </div>
      )}

      {/* Role management */}
      {tab === 'roles' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
          <RoleManagementClient />
        </div>
      )}

      {/* Audit log */}
      {tab === 'audit' && (
        status !== 'ready' || !data ? (
          <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />
        ) : (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Organization Audit Trail
              </h3>
            </div>
            {data.activities.length === 0 ? (
              <EmptyState icon={ScrollText} title="No audit events" message="No activity has been recorded across the organization yet." />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[560px] overflow-y-auto">
                {data.activities.map((act) => (
                  <div key={act.id} className="px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        <span className="font-semibold">{act.actor}</span> {act.description}
                        {act.target && <span className="text-slate-500"> → {act.target}</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {act.actorEmail && <span className="mr-2">{act.actorEmail}</span>}
                        {act.project && <span className="mr-2">· {act.project}</span>}
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase tracking-wide">{act.type}</span>
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
      <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
