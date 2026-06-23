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

export async function fetchDeveloperPerformance(): Promise<DeveloperPerformance> {
  const response = await apiClient.get<DeveloperPerformance>('/projects/global/developer-performance');
  return response.data;
}
