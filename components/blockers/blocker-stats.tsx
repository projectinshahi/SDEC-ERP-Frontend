import { Card } from '@/components/Card';

export default function BlockerStats() {
  // Placeholder stats
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
      <Card>
        <div className="flex flex-col items-center py-4">
          <span className="text-2xl font-bold">0</span>
          <span className="text-xs text-zinc-500">Total Blockers</span>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col items-center py-4">
          <span className="text-2xl font-bold">0</span>
          <span className="text-xs text-zinc-500">Open</span>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col items-center py-4">
          <span className="text-2xl font-bold">0</span>
          <span className="text-xs text-zinc-500">Resolved</span>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col items-center py-4">
          <span className="text-2xl font-bold">0</span>
          <span className="text-xs text-zinc-500">Critical Escalations</span>
        </div>
      </Card>
    </div>
  );
}
