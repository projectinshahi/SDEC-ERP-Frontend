'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Loader2 } from 'lucide-react';
import { InputField } from './InputField';
import { TextareaField } from './TextareaField';
import { MultiSelectMembers } from './MultiSelectMembers';
import { Project } from './ProjectCard';
import { fetchUsers } from '@/lib/api/users';

export interface ProjectFormData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  members: number[];
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting?: boolean;
  projectToEdit?: Project | null;
}

// Local helper to get today's date in YYYY-MM-DD in local time
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  projectToEdit = null,
}: CreateProjectModalProps) {
  const isEditMode = !!projectToEdit;

  const initialFormState = (): ProjectFormData => ({
    name: '',
    description: '',
    startDate: getTodayDateString(),
    endDate: '',
    members: [],
  });

  const [formData, setFormData] = useState<ProjectFormData>(initialFormState());
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});
  const [isResolvingMembers, setIsResolvingMembers] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus and pre-fill form when modal state changes
  useEffect(() => {
    if (!isOpen) return;

    const initializeForm = async () => {
      setErrors({});

      if (projectToEdit) {
        setIsResolvingMembers(true);
        let resolvedIds: number[] = [];

        try {
          // Load users to resolve project's member name strings back to their numeric IDs
          const allUsers = await fetchUsers();
          resolvedIds = projectToEdit.members
            .map((name) => allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is number => id !== undefined);
        } catch (err) {
          console.warn('Failed to fetch system users for mapping names in CreateProjectModal, using mock fallbacks:', err);
          // High-fidelity fallback mapping index
          const mockUsers: Record<string, number> = {
            'John Doe': 1,
            'Jane Smith': 2,
            'Alice Cooper': 3,
            'Bob Johnson': 4,
            'Charlie Brown': 5,
            'Diana Prince': 6
          };
          resolvedIds = projectToEdit.members
            .map((name) => mockUsers[name])
            .filter((id): id is number => id !== undefined);
        } finally {
          setIsResolvingMembers(false);
        }

        setFormData({
          name: projectToEdit.name,
          description: projectToEdit.description || '',
          startDate: projectToEdit.startDate || getTodayDateString(),
          endDate: projectToEdit.endDate || '',
          members: resolvedIds,
        });
      } else {
        setFormData(initialFormState());
      }

      // Small timeout to allow visual transition animation to complete
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
    };

    initializeForm();
  }, [isOpen, projectToEdit]);

  // Validation function enforcing correct bounds and required inputs
  const validateForm = (data: ProjectFormData) => {
    const tempErrors: Partial<Record<keyof ProjectFormData, string>> = {};

    if (!data.name.trim()) {
      tempErrors.name = 'Project name is required';
    } else if (data.name.length > 50) {
      tempErrors.name = 'Project name must be 50 characters or less';
    }

    if (data.description && data.description.length > 300) {
      tempErrors.description = 'Description must be 300 characters or less';
    }

    if (!data.startDate) {
      tempErrors.startDate = 'Start date is required';
    }

    // End date validation: must be on or after start date
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        tempErrors.endDate = 'End date must be on or after start date';
      }
    }

    if (data.members.length === 0) {
      tempErrors.members = 'At least one team member must be assigned';
    }

    return tempErrors;
  };

  // Run validation triggers on form modifications
  useEffect(() => {
    if (formData.name || formData.members.length > 0 || formData.endDate) {
      const formErrors = validateForm(formData);
      setErrors(formErrors);
    }
  }, [formData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formErrors = validateForm(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    if (isSubmitting || isResolvingMembers) return;
    setFormData(initialFormState());
    setErrors({});
    onClose();
  };

  // Enforce submit-disable if form has active validation errors
  const validationErrors = validateForm(formData);
  const isValid = Object.keys(validationErrors).length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Project' : 'Create New Project'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
        {/* Scrollable Input Drawer */}
        <div className="space-y-5 pr-1 overflow-y-auto max-h-[50vh] pb-4">
          {/* Project Name */}
          <InputField
            ref={nameInputRef}
            label="Project Name"
            id="project-name"
            required
            disabled={isSubmitting || isResolvingMembers}
            placeholder="Enter project name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />

          {/* Description */}
          <TextareaField
            label="Description"
            id="project-desc"
            disabled={isSubmitting || isResolvingMembers}
            placeholder="Enter project description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={errors.description}
            rows={3}
          />

          {/* Start and End Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              type="date"
              label="Start Date"
              id="project-start-date"
              required
              disabled={isSubmitting || isResolvingMembers}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={errors.startDate}
            />

            <InputField
              type="date"
              label="End Date (Optional)"
              id="project-end-date"
              disabled={isSubmitting || isResolvingMembers}
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={errors.endDate}
            />
          </div>

          {/* Team Member assignment searchable picker */}
          <MultiSelectMembers
            selectedIds={formData.members}
            onChange={(ids) => setFormData({ ...formData, members: ids })}
            error={errors.members}
          />
        </div>

        {/* Sticky footer buttons */}
        <div className="flex items-center gap-3 pt-5 border-t border-gray-100 dark:border-gray-700/50 mt-4 bg-white dark:bg-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting || isResolvingMembers}
            className="flex-1 font-semibold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isSubmitting || isResolvingMembers}
            className="flex-1 font-semibold flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <span>{isEditMode ? 'Save Changes' : 'Create Project'}</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
