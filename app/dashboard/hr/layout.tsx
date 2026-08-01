'use client';

/**
 * HR module RBAC gate.
 *
 * A single route-aware guard for EVERY /dashboard/hr/** route. The required
 * permission is resolved from permissionsForPath() — the same source the sidebar
 * uses — so page protection can never drift from sidebar visibility, every
 * sub-route / detail route is covered automatically, and the `hr.view` master
 * key (via the hrGrants bridge) and SuperAdmin always pass. Mirrors the Sales
 * layout exactly, replacing the previous scattered per-page guards.
 */

import type { ReactNode } from 'react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';

export default function HRLayout({ children }: { children: ReactNode }) {
  return <PermissionPageGuard fromPath>{children}</PermissionPageGuard>;
}
