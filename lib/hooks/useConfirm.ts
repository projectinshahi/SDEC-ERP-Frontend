'use client';

import { useConfirm as useConfirmContext } from '@/components/ConfirmDialogProvider';

export function useConfirm() {
  return useConfirmContext();
}
