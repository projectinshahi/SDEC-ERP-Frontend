import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { X } from 'lucide-react';
import { createSprintApi, updateSprintApi, type Board as Sprint } from '@/lib/api/kanban';
import { apiClient } from '@/lib/api/api-client';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editSprint?: Sprint | any | null;
  projectId?: string;
}

export function SprintModal({ isOpen, onClose, onSuccess, editSprint, projectId }: SprintModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    goal: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'Planned',
    estimatedHours: 0,
    capacity: 0,
    projectId: projectId || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDailyCapacity, setTotalDailyCapacity] = useState(0);

  useEffect(() => {
    if (projectId && isOpen) {
      apiClient.get(`/projects/${projectId}/members`)
        .then(res => {
          if (Array.isArray(res.data)) {
            const sum = res.data.reduce((acc, m) => acc + (Number(m.capacity_points) || 0), 0);
            setTotalDailyCapacity(sum);
          }
        })
        .catch(err => console.error('Failed to fetch members for capacity:', err));
    }
  }, [projectId, isOpen]);

  // Recalculate capacity based on totalDailyCapacity
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      capacity: 5 * totalDailyCapacity
    }));
  }, [totalDailyCapacity]);

  useEffect(() => {
    if (editSprint) {
      setFormData({
        id: editSprint.id,
        name: editSprint.name,
        goal: editSprint.goal || '',
        description: editSprint.description || '',
        startDate: editSprint.startDate ? new Date(editSprint.startDate).toISOString().slice(0, 10) : '',
        endDate: editSprint.endDate ? new Date(editSprint.endDate).toISOString().slice(0, 10) : '',
        status: editSprint.status,
        estimatedHours: editSprint.estimatedHours || 0,
        capacity: editSprint.capacity || 0,
        projectId: editSprint.projectId || projectId || undefined,
      });
    } else {
      setFormData({
        id: `SPRINT-${Math.floor(Math.random() * 10000)}`,
        name: '',
        goal: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'Planned',
        estimatedHours: 0,
        capacity: 0,
        projectId: projectId || undefined,
      });
    }
  }, [editSprint, isOpen, projectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { id: _id, estimatedHours, capacity, ...dataToSave } = formData;
      if (editSprint) {
        await updateSprintApi(Number(editSprint.id), { ...dataToSave });
      } else {
        await createSprintApi({ ...dataToSave });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      // apiClient throws an ApiError whose `message` is the backend error (e.g.
      // "You do not have permission to update sprint status.").
      setError(err?.message || err.response?.data?.message || 'An error occurred while saving the sprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{editSprint ? 'Edit Sprint' : 'Create New Sprint'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form id="sprint-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sprint Name <span className="text-red-500">*</span></label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="e.g. Sprint 42" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sprint Goal</label>
              <input type="text" name="goal" value={formData.goal} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" placeholder="What is the main objective of this sprint?" />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  Estimated Hours <span title="System calculated based on task estimates">🔒</span>
                </label>
                <input type="number" readOnly disabled name="estimatedHours" value={formData.estimatedHours} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 rounded-lg cursor-not-allowed transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  Team Capacity <span title="System calculated based on project member capacities and sprint duration">🔒</span>
                </label>
                <input type="number" readOnly disabled name="capacity" value={formData.capacity} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 rounded-lg cursor-not-allowed transition-all outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none" placeholder="Additional details or notes about this sprint..."></textarea>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="sprint-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editSprint ? 'Update Sprint' : 'Create Sprint'}
          </Button>
        </div>
      </div>
    </div>
  );
}
