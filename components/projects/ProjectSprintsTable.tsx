'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, Rocket, Plus, Edit2 } from 'lucide-react';
import { SprintModal } from '@/components/sprints/SprintModal';
import { classNames } from '@/lib/utils';

interface SprintRow {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  estimatedHours: number | null;
  capacity: number | null;
  tasksCount: number;
  progress?: number;
}

interface ProjectSprintsTableProps {
  projectId: string;
  userRole?: 'admin' | 'editor' | 'viewer' | null;
}

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#f59e0b', // amber
  'Active': '#3b82f6',  // blue
  'Completed': '#10b981', // emerald
};

import { useToast } from '@/lib/hooks/useToast';

export function ProjectSprintsTable({ projectId, userRole }: ProjectSprintsTableProps) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintRow | null>(null);
  const { toast } = useToast();

  const fetchSprintsList = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/projects/${projectId}/sprint-analytics`);
      if (res.data && res.data.sprintsList) {
        setSprints(res.data.sprintsList);
      }
    } catch (err) {
      console.error('Failed to load project sprints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSprintsList();
    }
  }, [projectId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Duration = End − Start, in whole days (UTC, so it can't drift by a day).
  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '—';
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '—';
    const days = Math.round(
      (Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()) -
        Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())) / 86400000,
    );
    return `${days} ${Math.abs(days) === 1 ? 'Day' : 'Days'}`;
  };



  if (loading) {
    return (
      <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm animate-pulse w-full">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sprint Tracking</h3>
          </div>
        </CardHeader>
        <CardBody className="p-10 flex justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm w-full overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Rocket size={18} className="text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sprint Tracking</h3>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-md transition-colors"
            title="Create New Sprint"
          >
            <Plus size={16} />
            Add Sprint
          </button>
        </CardHeader>
        
        {sprints.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
              <Rocket size={24} className="text-slate-400" />
            </div>
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">No sprints found</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mb-6">Create your first sprint to start tracking iterative progress for this project.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Start First Sprint
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider border-b border-slate-100 dark:border-slate-700/60">
                  <th className="p-4 pl-5">Sprint Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Start Date</th>
                  <th className="p-4">End Date</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Tasks</th>
                  <th className="p-4">Est. Points</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Progress</th>
                  {userRole !== 'viewer' && <th className="p-4">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm">
                {sprints.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 pl-5">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap inline-block"
                        style={{
                          backgroundColor: (STATUS_COLORS[s.status] || '#6b7280') + '18',
                          color: STATUS_COLORS[s.status] || '#6b7280',
                          borderColor: (STATUS_COLORS[s.status] || '#6b7280') + '40',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    {(s.startDate || s.endDate) ? (
                      <>
                        <td className="p-4 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(s.startDate)}
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(s.endDate)}
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDuration(s.startDate, s.endDate)}
                        </td>
                      </>
                    ) : (
                      <td colSpan={3} className="p-4 text-xs italic text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        No Sprint Dates Available
                      </td>
                    )}
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                      {s.tasksCount}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {s.estimatedHours || 0} pts
                    </td>
                    <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {s.capacity || 0} pts
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${s.progress ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tabular-nums w-9 text-right">
                          {s.progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    {userRole !== 'viewer' && (
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setEditingSprint(s);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Edit Sprint"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SprintModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSprint(null);
        }}
        onSuccess={fetchSprintsList}
        projectId={projectId}
        editSprint={editingSprint}
      />
    </>
  );
}
