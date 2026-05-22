import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/Layout';

export const metadata: Metadata = {
  title: 'Dashboard | ERP System',
  description: 'Main dashboard overview',
};

/**
 * Shared Dashboard Layout wrapper for all /dashboard sub-routes.
 * Ensures the Dashboard sidebar and navbar stay mounted during route transitions,
 * perfectly retaining state (such as the collapsed state) without visual glitches.
 */
export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
