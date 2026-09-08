'use client';

/**
 * Marketing module RBAC gate.
 *
 * One route-aware guard for EVERY /dashboard/marketing/** route. The required
 * permission is resolved from permissionsForPath() — the same source the sidebar
 * uses — so page protection can never drift from sidebar visibility, and every
 * sub-route added in later phases is covered automatically. SuperAdmin/Admin pass
 * via the existing bypass. Mirrors the HR/Sales layout guards exactly.
 */

import type { ReactNode } from 'react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  // showDenied: an unauthorized user gets the explained access-denied state with
  // a way back, rather than a silent bounce to /dashboard.
  return <PermissionPageGuard fromPath showDenied>{children}</PermissionPageGuard>;
}
