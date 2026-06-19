'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Code2, TrendingUp, ShieldCheck, LayoutDashboard, ArrowRight, LogOut, Building2, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getModuleAccess, normalizeRole } from '@/lib/permissions/moduleAccess';
import { classNames } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
 * Role-based ERP entry point.
 *
 * After login every user lands here and sees ONLY the module cards their role
 * (and granular permissions) allow. Each card is fully clickable AND carries an
 * explicit "Open <Module>" CTA button (with hover + loading state):
 *   • Sales      → Sales
 *   • Developer  → Development
 *   • Admin      → Development + Sales + User Management
 *   • SuperAdmin → Master Dashboard + Development + Sales + User Management
 *
 * Access is decided by BOTH the role name (normalised) and the live RBAC
 * permission set, so custom roles are handled correctly too.
 * ────────────────────────────────────────────────────────────────────────── */

const ACCENTS: Record<string, { ring: string; iconBg: string; iconText: string; grad: string; btn: string; badge: string }> = {
  indigo: {
    ring: 'hover:border-indigo-500 dark:hover:border-indigo-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50', iconText: 'text-indigo-600 dark:text-indigo-400',
    grad: 'from-indigo-50 dark:from-indigo-900/20', btn: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  blue: {
    ring: 'hover:border-blue-500 dark:hover:border-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50', iconText: 'text-blue-600 dark:text-blue-400',
    grad: 'from-blue-50 dark:from-blue-900/20', btn: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  emerald: {
    ring: 'hover:border-emerald-500 dark:hover:border-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400',
    grad: 'from-emerald-50 dark:from-emerald-900/20', btn: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  violet: {
    ring: 'hover:border-violet-500 dark:hover:border-violet-500',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconText: 'text-violet-600 dark:text-violet-400',
    grad: 'from-violet-50 dark:from-violet-900/20', btn: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  },
};

export default function ModulesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [navigating, setNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  // ── Role + permission driven module access (shared single source of truth) ──
  const modules = useMemo(() => {
    const access = getModuleAccess(user);
    return [
      { key: 'master', show: access.master, href: '/master-dashboard', icon: LayoutDashboard, accent: 'indigo',
        title: 'Master Dashboard', cta: 'Open Master Dashboard',
        desc: 'Enterprise-wide analytics, reporting and executive controls.' },
      { key: 'development', show: access.development, href: '/dashboard', icon: Code2, accent: 'blue',
        title: 'Development', cta: 'Open Development',
        desc: 'Manage projects, boards, tasks, tickets, meetings and sprint workflows.' },
      { key: 'sales', show: access.sales, href: '/dashboard/sales', icon: TrendingUp, accent: 'emerald',
        title: 'Sales', cta: 'Open Sales',
        desc: 'Manage leads, pipeline, deals, CRM activities, reports and analytics.' },
      { key: 'users', show: access.user, href: '/dashboard/user-management', icon: ShieldCheck, accent: 'violet',
        title: 'User Management', cta: 'Open User Management',
        desc: 'Manage users, roles, permissions and access control.' },
    ].filter((m) => m.show);
  }, [user]);

  const accessLevel = useMemo(() => {
    const r = normalizeRole(user?.roleName) || normalizeRole(user?.role);
    if (r === 'superadmin') return 'Full Access';
    if (r === 'admin') return 'Administrator';
    return user?.roleName || 'Member';
  }, [user]);

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

  const gridCols = modules.length >= 4 ? 'lg:grid-cols-4'
    : modules.length === 3 ? 'lg:grid-cols-3'
      : modules.length === 2 ? 'sm:grid-cols-2 lg:grid-cols-2 max-w-3xl mx-auto'
        : 'max-w-md mx-auto';

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">SDEC ERP</span>
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
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${gridCols}`}>
              {modules.map(({ key, href, icon: Icon, accent, title, desc, cta }) => {
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
                    aria-label={cta}
                    className={classNames(
                      'group relative bg-white dark:bg-slate-900 rounded-2xl p-6 text-left shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col min-h-[210px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400',
                      a.ring,
                    )}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${a.grad} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative flex-1">
                      <div className="flex items-start justify-between gap-2 mb-5">
                        <div className={`w-14 h-14 ${a.iconBg} rounded-xl flex items-center justify-center ${a.iconText} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold', a.badge)}>
                          {accessLevel}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                    </div>

                    {/* Explicit "Open Module" CTA */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openModule(key, href); }}
                      disabled={isNavigating}
                      className={classNames(
                        'group/btn relative mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-wait',
                        a.btn,
                      )}
                    >
                      {isNavigating ? (
                        <><Loader2 size={16} className="animate-spin" /> Opening…</>
                      ) : (
                        <>{cta} <ArrowRight size={16} className="transition-transform duration-200 group-hover/btn:translate-x-0.5" /></>
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
