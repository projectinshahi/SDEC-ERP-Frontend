'use client';

/**
 * Sales module RBAC gate.
 *
 * A single route-aware guard for EVERY /dashboard/sales/** route. The required
 * permission is resolved from permissionsForPath() — the same source the sidebar
 * uses — so page protection can never drift from sidebar visibility, every
 * sub-route / detail route is covered automatically, and the 'sales.view' master
 * key (and SuperAdmin) always pass. This mirrors the Development module's
 * per-page guards without 30 hand-maintained guard props.
 */

import type { ReactNode } from 'react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

export default function SalesLayout({ children }: { children: ReactNode }) {
  return <PermissionPageGuard fromPath>{children}</PermissionPageGuard>;
}
