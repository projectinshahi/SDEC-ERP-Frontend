'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { UserPlus } from 'lucide-react';
import { ProjectMember } from '@/components/projects/ProjectCard';
import { ProjectMemberTable, MemberDetail } from '@/components/projects/ProjectMemberTable';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MemberDetail[]) => Promise<void>;
  existingMembers: ProjectMember[];
}

export function AddMemberModal({ isOpen, onClose, onSubmit, existingMembers }: AddMemberModalProps) {
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (existingMembers && existingMembers.length > 0) {
        setMemberDetails(existingMembers.map(m => ({
          userId: m.userId,
          role: m.role || 'viewer',
          capacityPoints: (m as any).capacityPoints || 0
        })));
      } else {
        setMemberDetails([{ userId: 0, role: 'viewer', capacityPoints: 0 }]);
      }
      setError('');
    }
  }, [isOpen, existingMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty rows
    const validMembers = memberDetails.filter(m => m.userId > 0);
    
    if (validMembers.length === 0) {
      setError('Please assign at least one member to the project.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(validMembers);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Project Members" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="pt-2">
          <ProjectMemberTable 
            memberDetails={memberDetails} 
            onChange={setMemberDetails} 
            error={error}
          />
        </div>

        {/* Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800/60 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || memberDetails.filter(m => m.userId > 0).length === 0}>
            <UserPlus size={16} className="mr-1.5" />
            Save Members
          </Button>
        </div>
      </form>
    </Modal>
  );
}
