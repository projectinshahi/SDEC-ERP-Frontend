import { apiClient } from './api-client';

/**
 * Developer Performance dashboard — types + fetcher.
 *
 * All figures are LIVE, derived server-side from kanban tasks (story points,
 * assignee, status column, due date), bugs (assignedTo/status) and activity
 * logs (actor + task_id + created_at). See GET /projects/global/developer-performance.
 */

export interface DeveloperRow {
  id: number;
  name: string;
  role: string;
  status: string;
  online: boolean;
  activeProjects: number;
  assignedPoints: number;
  completedPoints: number;
  todayPoints: number;
  completionRate: number;
  tasksPending: number;
  bugs: number;
  lastActivity: string | null;
  utilization: number;
  devStatus: 'Active' | 'Busy';
}

export interface DeveloperPerformance {
  capacity: {
    totalDevelopers: number;
    activeDevelopers: number;
    availableDevelopers: number;
    utilization: number;
  };
  delivery: {
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;
    velocityPerWeek: number;
  };
  quality: {
    bugsRaised: number;
    bugsFixed: number;
    reopenRate: number;
    qaPassRate: number;
  };
  timeline: {
    tasksDelayed: number;
    tasksOnTime: number;
    avgDelayDays: number;
    slaPercent: number;
  };
  daily: {
    pointsToday: number;
    activeToday: number;
    avgPointsPerDev: number;
    topContributor: { name: string; points: number } | null;
  };
  developers: DeveloperRow[];
  taskStatus: {
    todo: number;
    inProgress: number;
    review: number;
    qa: number;
    completed: number;
    total: number;
  };
  topPerformers: { id: number; name: string; points: number }[];
  capacityForecast: { id: number; name: string; currentLoad: number; availableCapacity: number }[];
  velocityTrend: { week: string; assigned: number; completed: number }[];
}

/**
 * Fetch developer performance, optionally scoped to a date window. When
 * startDate/endDate (YYYY-MM-DD) are provided, the server recalculates every
 * period metric from activity within that range; omit both for all-time.
 */
export async function fetchDeveloperPerformance(
  startDate?: string,
  endDate?: string,
): Promise<DeveloperPerformance> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  const response = await apiClient.get<DeveloperPerformance>(
    `/projects/global/developer-performance${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}
