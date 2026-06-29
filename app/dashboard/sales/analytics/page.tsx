'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { List, SlidersHorizontal } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { LeadAnalyticsDashboard } from '@/components/leads/LeadAnalyticsDashboard';

export default function LeadAnalyticsPage() {
  const { hasPermission } = usePermissions();
  const canConfigureScoring = hasPermission('sales.scoring');

  return (
    <PermissionPageGuard require="sales.leads.analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Lead Analytics', href: '/dashboard/sales/analytics' },
            ]}
          />
          <div className="flex gap-2">
            {canConfigureScoring && (
              <Link href="/dashboard/leads/scoring-settings">
                <Button variant="secondary">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Scoring Settings
                </Button>
              </Link>
            )}
            <Link href="/dashboard/sales/leads">
              <Button variant="secondary">
                <List className="w-4 h-4 mr-2" />
                Leads
              </Button>
            </Link>
          </div>
        </div>

        <LeadAnalyticsDashboard />
      </div>
    </PermissionPageGuard>
  );
}
