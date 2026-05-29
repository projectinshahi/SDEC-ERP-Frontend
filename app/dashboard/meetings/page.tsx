import type { Metadata } from 'next';
import MeetingsClient from './MeetingsClient';

export const metadata: Metadata = {
  title: 'Meeting Management | ERP System',
  description: 'Manage project meetings, attendees, schedules, and action items.',
};

/**
 * Meetings page - Server Component wrapper
 */
export default function MeetingsPage() {
  return <MeetingsClient />;
}
