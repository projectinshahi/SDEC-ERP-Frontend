import type { Metadata } from 'next';
import { SprintClient } from './SprintClient';

export const metadata: Metadata = {
  title: 'Sprint Tracking | ERP System',
  description: 'Manage sprints, boards, and performance analytics',
};

export default function SprintsPage() {
  return <SprintClient />;
}
