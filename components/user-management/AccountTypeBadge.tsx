import type { User } from '@/lib/types/user-management';

/** Company = added from User Management; External = mobile-app self sign-up. */
export function AccountTypeBadge({ type }: { type?: User['accountType'] }) {
  if (!type) return <span className="text-slate-400">—</span>;
  return type === 'external' ? (
    <span title="Self sign-up from the app — limited to My Tasks"
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200">External</span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Company</span>
  );
}
