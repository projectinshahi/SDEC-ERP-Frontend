'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings, Loader2, Plus, AlertTriangle, ShieldCheck, History, Bell, Users as UsersIcon } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  fetchAllReferenceData, createReferenceItem, updateReferenceItem,
  fetchNotificationSettings, saveNotificationSettings,
  fetchAuditLog,
  REFERENCE_TABLES,
  type ReferenceData, type ReferenceItem, type ReferenceTable,
  type ContentNotificationSettings, type AuditEntry,
} from '@/lib/api/marketingContent';

/**
 * M10 — Marketing Administration.
 *
 * Reference Data (#43), Notification Settings (#45) and the Audit Log (#46).
 * Every control here is an affordance: the page is route-guarded on
 * `marketing.settings.manage` and every endpoint re-checks the same permission,
 * so hiding a button is never what stops a non-admin.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

function Panel({ icon: Icon, title, subtitle, children, action }: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Icon className="h-4 w-4 text-cyan-600" /> {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── #43 Reference data ────────────────────────────────────────────────────── */

function ReferenceList({ label, items, busy, onAdd, onRename, onToggleActive }: {
  label: string; items: ReferenceItem[]; busy: boolean;
  onAdd: (name: string) => Promise<void>;
  onRename: (item: ReferenceItem, name: string) => Promise<void>;
  onToggleActive: (item: ReferenceItem) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const active = items.filter((i) => i.active).length;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2">
        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</h3>
        <span className="rounded-full bg-gray-200/80 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold leading-none text-gray-600 dark:text-gray-400">
          {active} active
        </span>
      </div>

      <ul className="max-h-60 divide-y divide-gray-50 dark:divide-gray-800/60 overflow-y-auto">
        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-gray-400">Nothing configured yet.</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            {editing?.id === item.id ? (
              <>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ id: item.id, name: e.target.value })}
                  className={classNames(inputCls, 'flex-1 min-w-[140px] py-1 text-xs')}
                  aria-label={`Rename ${item.name}`}
                />
                <button type="button" disabled={busy || !editing.name.trim()}
                  onClick={async () => { await onRename(item, editing.name.trim()); setEditing(null); }}
                  className="rounded-lg bg-cyan-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60">Save</button>
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">Cancel</button>
              </>
            ) : (
              <>
                <span className={classNames('min-w-0 flex-1 truncate text-sm',
                  item.active ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 line-through')} title={item.name}>
                  {item.name}
                </span>
                {!item.active && (
                  <span className="rounded-full border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">Inactive</span>
                )}
                <button type="button" disabled={busy} onClick={() => setEditing({ id: item.id, name: item.name })}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60">
                  Edit
                </button>
                <button type="button" disabled={busy} onClick={() => onToggleActive(item)}
                  className={classNames('rounded-lg border px-2 py-1 text-[11px] font-semibold disabled:opacity-60',
                    item.active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50')}>
                  {item.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add to ${label}`}
          aria-label={`Add to ${label}`}
          className={classNames(inputCls, 'flex-1 py-1 text-xs')}
        />
        <button type="button" disabled={busy || !draft.trim()}
          onClick={async () => { await onAdd(draft.trim()); setDraft(''); }}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <p className="px-3 pb-2 text-[10px] text-gray-400">
        Deactivating hides <b>{label.toLowerCase()}</b> from new cards. Cards already using a value keep it.
      </p>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────────────────── */

const NOTIFICATION_EVENTS = [
  { key: 'assignment_enabled', label: 'Assigned to a card', hint: 'A user is newly assigned to a card' },
  { key: 'stage_enabled', label: 'Card reached your stage', hint: 'A card enters the stage this member is responsible for' },
  { key: 'approver_enabled', label: 'Card arrived for Approver review', hint: 'A card enters Review / Approval' },
  { key: 'decision_enabled', label: 'Approval decision to Content Owner', hint: 'Approved, Changes Requested or Rejected' },
] as const;

export default function MarketingAdministrationPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('marketing.settings.manage');

  const [refs, setRefs] = useState<ReferenceData | null>(null);
  const [settings, setSettings] = useState<ContentNotificationSettings | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTypes, setAuditTypes] = useState<{ key: string; label: string }[]>([]);
  const [auditType, setAuditType] = useState('all');
  const [auditOffset, setAuditOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const AUDIT_PAGE = 50;

  const loadRefs = useCallback(async () => { setRefs(await fetchAllReferenceData()); }, []);
  const loadAudit = useCallback(async () => {
    const page = await fetchAuditLog({
      limit: String(AUDIT_PAGE), offset: String(auditOffset),
      ...(auditType !== 'all' ? { type: auditType } : {}),
    });
    setAudit(page.entries);
    setAuditTotal(page.total);
    if (page.types.length) setAuditTypes(page.types);
  }, [auditOffset, auditType]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [, s] = await Promise.all([loadRefs(), fetchNotificationSettings(), loadAudit()]);
      setSettings(s);
    } catch (err) {
      setError(apiError(err) || (err as Error)?.message || 'Failed to load Administration.');
    } finally {
      setLoading(false);
    }
  }, [loadRefs, loadAudit]);

  /* ONE effect owns loading. `loadAudit` is memoised on the filter + offset, so
   * changing either re-runs this automatically — no second effect re-fetching
   * on top of the first, and no double request on mount. */
  useEffect(() => { load(); }, [load]);

  const onAdd = async (table: ReferenceTable, name: string) => {
    setBusy(true);
    try {
      await createReferenceItem(table, name);
      await loadRefs();
      await loadAudit();
      toast(`“${name}” added successfully`, 'success');
    } catch (err) {
      toast(apiError(err) || `Unable to add “${name}”`, 'error');
    } finally { setBusy(false); }
  };

  const onRename = async (table: ReferenceTable, item: ReferenceItem, name: string) => {
    if (name === item.name) return;
    setBusy(true);
    try {
      await updateReferenceItem(table, item.id, { name });
      await loadRefs();
      await loadAudit();
      toast(`Renamed to “${name}” successfully`, 'success');
    } catch (err) {
      toast(apiError(err) || 'Unable to rename that item', 'error');
    } finally { setBusy(false); }
  };

  const onToggleActive = async (table: ReferenceTable, item: ReferenceItem) => {
    if (item.active) {
      const okToGo = await confirm({
        title: `Deactivate “${item.name}”?`,
        message: 'It will no longer be selectable on new content cards. Cards already using it keep their value and are not changed.',
        confirmLabel: 'Deactivate',
        intent: 'danger',
      });
      if (!okToGo) return;
    }
    setBusy(true);
    try {
      await updateReferenceItem(table, item.id, { active: !item.active });
      await loadRefs();
      await loadAudit();
      toast(`“${item.name}” ${item.active ? 'deactivated' : 'reactivated'} successfully`, 'success');
    } catch (err) {
      toast(apiError(err) || 'Unable to update that item', 'error');
    } finally { setBusy(false); }
  };

  const onToggleSetting = async (key: string, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });   // optimistic
    try {
      setSettings(await saveNotificationSettings({ [key]: value }));
      await loadAudit();
      toast('Notification settings updated successfully', 'success');
    } catch (err) {
      setSettings(previous);                       // rolled back on failure
      toast(apiError(err) || 'Unable to update the notification setting', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-300"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Marketing Administration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Reference data, notification events and the audit trail.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => { setLoading(true); load(); }} className="ml-auto rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white">Retry</button>
        </div>
      )}

      {!canManage && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can view this page but not change anything — Administration changes require the Marketing settings permission.
        </p>
      )}

      {/* #43 */}
      <Panel icon={ShieldCheck} title="Reference Data"
        subtitle="Six admin-managed lists. Deactivating is non-destructive: existing cards keep their value.">
        {refs ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {REFERENCE_TABLES.map((t) => (
              <ReferenceList
                key={t.key}
                label={t.label}
                items={refs[t.key]}
                busy={busy || !canManage}
                onAdd={(name) => onAdd(t.key, name)}
                onRename={(item, name) => onRename(t.key, item, name)}
                onToggleActive={(item) => onToggleActive(t.key, item)}
              />
            ))}
          </div>
        ) : <p className="py-4 text-center text-sm text-gray-400">Reference data unavailable.</p>}
      </Panel>

      {/* #45 */}
      <Panel icon={Bell} title="Notification Settings"
        subtitle="Each event is independent. Disabling stops FUTURE notifications; existing ones are never deleted.">
        {settings ? (
          <ul className="space-y-2">
            {NOTIFICATION_EVENTS.map((e) => (
              <li key={e.key} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                <input
                  id={`notif-${e.key}`}
                  type="checkbox"
                  checked={settings[e.key] === true}
                  disabled={!canManage}
                  onChange={(ev) => onToggleSetting(e.key, ev.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor={`notif-${e.key}`} className="cursor-pointer">
                  <span className="block text-sm text-gray-700 dark:text-gray-300">{e.label}</span>
                  <span className="block text-[11px] text-gray-400">{e.hint}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : <p className="py-4 text-center text-sm text-gray-400">Settings unavailable.</p>}
      </Panel>

      {/* #44 pointer — user management lives in its own existing module. */}
      <Panel icon={UsersIcon} title="Team Members"
        subtitle="Users, roles and activation are managed in the existing User Management module.">
        <a href="/dashboard/user-management/users"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <UsersIcon className="h-3.5 w-3.5" /> Open User Management
        </a>
      </Panel>

      {/* #46 */}
      <Panel icon={History} title="Audit Log"
        subtitle="Append-only and read-only. Entries are generated server-side; there are no edit or delete controls."
        action={
          <select value={auditType} onChange={(e) => { setAuditType(e.target.value); setAuditOffset(0); }}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300"
            aria-label="Filter audit entries by type">
            <option value="all">All actions</option>
            {auditTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        }>
        {audit.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No audit entries match this filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="whitespace-nowrap px-3 py-2">When</th>
                    <th className="whitespace-nowrap px-3 py-2">Actor</th>
                    <th className="whitespace-nowrap px-3 py-2">Action</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0 dark:border-gray-800/60">
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400">{dateTime(e.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300">{e.actorName ?? 'Unknown'}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                          {e.typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="break-words">{e.description}</span>
                        {e.fromStageLabel && e.toStageLabel && (
                          <span className="block text-[11px] text-gray-400">{e.fromStageLabel} → {e.toStageLabel}</span>
                        )}
                        {e.notes && <span className="block text-[11px] text-gray-400">“{e.notes}”</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{auditOffset + 1}–{Math.min(auditOffset + AUDIT_PAGE, auditTotal)} of {auditTotal}</span>
              <span className="flex gap-2">
                <button type="button" disabled={auditOffset === 0} onClick={() => setAuditOffset(Math.max(0, auditOffset - AUDIT_PAGE))}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 font-semibold disabled:opacity-50">Previous</button>
                <button type="button" disabled={auditOffset + AUDIT_PAGE >= auditTotal} onClick={() => setAuditOffset(auditOffset + AUDIT_PAGE)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 font-semibold disabled:opacity-50">Next</button>
              </span>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
