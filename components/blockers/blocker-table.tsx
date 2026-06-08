import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import EditBlockerModal from './edit-blocker-modal';

export default function BlockerTable() {
  // Placeholder data for structure
  const blockers = [];
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <tr>
            <th className="px-4 py-2 text-left">Title</th>
            <th className="px-4 py-2 text-left">Project</th>
            <th className="px-4 py-2 text-left">Severity</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Logged By</th>
            <th className="px-4 py-2 text-left">Assigned To</th>
            <th className="px-4 py-2 text-left">Escalation</th>
            <th className="px-4 py-2 text-left">Created At</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Map blockers here */}
          {blockers.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-8 text-zinc-400">No blockers found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
