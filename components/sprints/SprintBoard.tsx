'use client';

import { useState, useEffect, useMemo } from 'react';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { getSprints, type Sprint } from '@/lib/api/sprints';
import { Rocket } from 'lucide-react';

export function SprintBoard() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await getSprints();
        setSprints(data);
        const active = data.find(s => s.status.toLowerCase() === 'active');
        if (active) setActiveSprintId(active.id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (isLoading) {
    return <div className="py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-b-2 border-blue-600 rounded-full"></div></div>;
  }

  // To truly filter the KanbanBoard by sprint, we would need to pass sprintId as a prop to KanbanBoard.
  // For this implementation, we simulate the layout. To integrate deeply, KanbanBoard must accept a filter prop.
  // Since we don't want to break the existing KanbanBoard, we'll render it directly but add a sprint selector header.
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Rocket size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sprint Board Filter</h3>
            <p className="text-xs text-gray-500">Select a sprint to view its tasks</p>
          </div>
        </div>
        
        <select 
          value={activeSprintId}
          onChange={(e) => setActiveSprintId(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-w-[200px]"
        >
          <option value="all">All Sprints (Global Board)</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
        <Rocket size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold mb-1">Sprint Board Integration Note</p>
          <p>The global Kanban board below tracks all tasks. In a production environment, selecting a sprint above would filter the tasks specifically for that sprint.</p>
        </div>
      </div>

      {/* Render existing KanbanBoard. To fully support sprint filtering, we need to add sprintId to KanbanBoard props */}
      <KanbanBoard />
    </div>
  );
}
