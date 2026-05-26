'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Plus, Edit, Trash2, Rocket } from 'lucide-react';
import { getSprints, deleteSprint, type Sprint } from '@/lib/api/sprints';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { classNames } from '@/lib/utils';
import { SprintModal } from './SprintModal';

export function SprintList() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const fetchSprints = async () => {
    setIsLoading(true);
    try {
      const data = await getSprints();
      setSprints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sprint?')) {
      try {
        await deleteSprint(id);
        fetchSprints();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200'; // planned
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Sprints</h2>
        <PermissionGuard require="sprints.create">
          <Button onClick={() => { setEditingSprint(null); setIsModalOpen(true); }} variant="primary" size="sm">
            <Plus size={16} className="mr-1" /> Create Sprint
          </Button>
        </PermissionGuard>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-b-2 border-blue-600 rounded-full"></div></div>
        ) : sprints.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Rocket size={48} className="text-gray-300 mb-4" />
            <p className="font-semibold text-lg text-gray-700">No sprints found</p>
            <p className="text-sm">Create your first sprint to start planning work.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Tasks</th>
                  <th className="p-4">Est. Hours</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {sprints.map(sprint => (
                  <tr key={sprint.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{sprint.name}</p>
                      {sprint.goal && <p className="text-xs text-gray-500 truncate max-w-[200px]">{sprint.goal}</p>}
                    </td>
                    <td className="p-4">
                      <span className={classNames('px-2 py-1 rounded text-xs font-bold border', getStatusConfig(sprint.status))}>
                        {sprint.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-xs">
                      {sprint.startDate && sprint.endDate ? (
                        <>
                          <div className="whitespace-nowrap">{new Date(sprint.startDate).toLocaleDateString()} - </div>
                          <div className="whitespace-nowrap">{new Date(sprint.endDate).toLocaleDateString()}</div>
                        </>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-gray-600 font-semibold">
                      {sprint._count?.tasks || 0}
                    </td>
                    <td className="p-4 text-gray-600 font-semibold">
                      {sprint.estimatedHours || 0}h
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <PermissionGuard require="sprints.update">
                          <button onClick={() => { setEditingSprint(sprint); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit size={16} />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard require="sprints.delete">
                          <button onClick={() => handleDelete(sprint.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SprintModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchSprints} 
        editSprint={editingSprint} 
      />
    </div>
  );
}
