'use client';

import { Settings } from 'lucide-react';
import { FinancePlaceholder } from '@/components/finance/FinancePlaceholder';

export default function FinanceSettingsPage() {
  return (
    <FinancePlaceholder
      title="Settings"
      description="Finance preferences, tax configuration and integrations."
      icon={Settings}
    />
  );
}
