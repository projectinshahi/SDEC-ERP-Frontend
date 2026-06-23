'use client';

import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { DeveloperPerformanceView } from '@/components/developer-performance/DeveloperPerformanceView';

/**
 * Developer Performance — Development module (/dashboard/developer-performance).
 * Gated on project.view; renders the shared live analytics view (same view +
 * API reused by the Master Dashboard page).
 */
export default function DeveloperPerformancePage() {
  return (
    <PermissionPageGuard require="project.view">
      <DeveloperPerformanceView />
    </PermissionPageGuard>
  );
}
