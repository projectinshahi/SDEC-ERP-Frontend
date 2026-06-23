'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Code2, ShieldCheck, Briefcase, Users, ArrowRight, LogOut, Building2, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { getModuleAccess, type TopModule } from '@/lib/permissions/moduleAccess';
import { firstAccessibleHref } from '@/lib/sidebar/sidebar.config';
import { classNames } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
 * Role-based ERP entry point.
 *
 * After login every user lands here and sees ONLY the module cards their role
 * (and granular permissions) allow:
 *   • Sales      → Sales
 *   • Developer  → Development
 *   • Admin      → Sales + Development + User Management
 *   • SuperAdmin → Master Dashboard + Sales + Development + User Management
 *
 * "Master Dashboard" is the UI label for the SuperAdmin-only card (→ /master-dashboard).
 * The SuperAdmin role/permissions are unchanged — only the displayed card name.
 *
 * Access is decided by BOTH the role name (normalised) and the live RBAC
 * permission set, so custom roles are handled correctly too. SuperAdmin bypasses
 * every check (see usePermissions / getModuleAccess / backend isGlobalAdmin).
 * ────────────────────────────────────────────────────────────────────────── */

const ACCENTS: Record<string, { ring: string; iconBg: string; iconText: string; btn: string }> = {
  indigo: {
    ring: 'hover:border-indigo-400 dark:hover:border-indigo-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50', iconText: 'text-indigo-600 dark:text-indigo-400',
    btn: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
  },
  emerald: {
    ring: 'hover:border-emerald-400 dark:hover:border-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400',
    btn: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
  },
  blue: {
    ring: 'hover:border-blue-400 dark:hover:border-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50', iconText: 'text-blue-600 dark:text-blue-400',
    btn: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
  violet: {
    ring: 'hover:border-violet-400 dark:hover:border-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconText: 'text-violet-600 dark:text-violet-400',
    btn: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500',
  },
};

export default function ModulesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const [navigating, setNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // ── Role + permission driven module access (shared single source of truth).
  // Card order: Master Dashboard · Sales · Development · User Management.
  const modules = useMemo(() => {
    const access = getModuleAccess(user);
    // Land on the first page the user can actually see in each module (e.g. a
    // leads-only sales user opens directly on Leads, not the gated Overview).
    const hrefFor = (m: TopModule, fallback: string) => firstAccessibleHref(m, hasAnyPermission) ?? fallback;
    return [
      { key: 'master', show: access.master, href: '/master-dashboard', icon: ShieldCheck, accent: 'indigo',
        title: 'Master Dashboard', desc: 'Enterprise-wide analytics, oversight, reporting & admin controls.' },
      { key: 'sales', show: access.sales, href: hrefFor('sales', '/dashboard/sales'), icon: Briefcase, accent: 'emerald',
        title: 'Sales', desc: 'Leads, pipeline, deals & CRM.' },
      { key: 'development', show: access.development, href: hrefFor('development', '/dashboard'), icon: Code2, accent: 'blue',
        title: 'Development', desc: 'Projects, boards, tasks & sprints.' },
      { key: 'users', show: access.user, href: hrefFor('user', '/dashboard/user-management'), icon: Users, accent: 'violet',
        title: 'User Management', desc: 'Users, roles & permissions.' },
    ].filter((m) => m.show);
  }, [user, hasAnyPermission]);

  const openModule = (key: string, href: string) => {
    if (navigating) return;
    setNavigating(key);
    router.push(href);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Fixed 5-column grid (5×5-ready for up to 25 modules). Compact square cards;
  // responsive: 2 (mobile) · 3 (sm) · 4 (md) · 5 (lg+). A lone module is centered.
  const gridCls = modules.length === 1
    ? 'grid-cols-1 max-w-[240px]'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-6xl';

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">SHAHI SOLUTIONS</span>
          </div>
          <button
            onClick={() => { logout?.(); router.replace('/login'); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-6xl space-y-10">
          <header className="text-center space-y-3">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Workspace</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome, {user?.name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {modules.length > 1
                ? 'Select a module to continue. You only see the modules your role grants access to.'
                : 'Continue to your workspace.'}
              {user?.roleName && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 capitalize align-middle">
                  {user.roleName}
                </span>
              )}
            </p>
          </header>

          {modules.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">No modules available</h2>
              <p className="text-sm text-slate-500 mt-2">
                Your account has no module access yet. Contact an administrator to be assigned a role.
              </p>
            </div>
          ) : (
            <div className={classNames('mx-auto grid gap-5', gridCls)}>
              {modules.map(({ key, href, icon: Icon, accent, title, desc }) => {
                const a = ACCENTS[accent];
                const isNavigating = navigating === key;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModule(key, href)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModule(key, href); }
                    }}
                    aria-label={`Open ${title}`}
                    className={classNames(
                      'group flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.97] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-950',
                      a.ring,
                    )}
                  >
                    <div className={classNames(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
                      a.iconBg, a.iconText,
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                    <p className="mt-1 min-h-[2rem] text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
                      {desc}
                    </p>

                    {/* Explicit "Open" button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openModule(key, href); }}
                      disabled={isNavigating}
                      className={classNames(
                        'mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-wait',
                        a.btn,
                      )}
                    >
                      {isNavigating ? (
                        <><Loader2 size={15} className="animate-spin" /> Opening…</>
                      ) : (
                        <>Open <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
