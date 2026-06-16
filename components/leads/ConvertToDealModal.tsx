'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { useToast } from '@/lib/hooks/useToast';
import { convertLeadToDeal } from '@/lib/api/leadLifecycle';
import type { LeadDetail } from '@/lib/types/lead';

interface ConvertToDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDetail;
  onConverted: () => void;
}

/**
 * SE-010 — convert a qualified lead into a deal. Lead data (name/company/contact/
 * owner/source/notes) carries over automatically on the server; the user only
 * sets an optional initial deal amount.
 */
export function ConvertToDealModal({ isOpen, onClose, lead, onConverted }: ConvertToDealModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [amount, setAmount] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setAmount('0');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const deal = await convertLeadToDeal(lead.id, Number(amount) || 0);
      toast('Lead converted to deal', 'success');
      onConverted();
      onClose();
      router.push(`/dashboard/sales/deals/pipeline?highlight=${deal.id}`);
    } catch (error: any) {
      toast(error?.message || 'Failed to convert lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Lead to Deal" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-sm">
          <TrendingUp size={18} className="mt-0.5 shrink-0" />
          <span>
            A new deal will be created in the <strong>Proposal Sent</strong> stage, carrying over the
            contact, owner, source and notes from <strong>{lead.title}</strong>. The lead is then marked
            <strong> Converted</strong>.
          </span>
        </div>

        <InputField
          label="Initial Deal Amount" id="deal-amount" type="number"
          value={amount} onChange={setAmount} placeholder="0"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success" isLoading={isSaving}>Convert to Deal</Button>
        </div>
      </form>
    </Modal>
  );
}
