import { apiClient } from './api-client';

/* ── Marketing → Project workspace API ────────────────────────────────────────
 * Thin client over /marketing/projects. Every call carries the project id in the
 * PATH, and the backend re-resolves and authorizes it on each request — the
 * active project held in the UI is a convenience, never an authorization input.
 *
 * NOTE: apiClient.get returns an AxiosResponse — read `.data`. */

export interface MarketingProject {
  id: number;
  clientId: number;
  name: string;
  status: 'active' | 'archived' | string;
  description: string | null;
  startDate: string | null;   // 'YYYY-MM-DD'
  endDate: string | null;     // 'YYYY-MM-DD'
  clientName?: string | null;
}

export interface MarketingClientWithProjects {
  id: number;
  name: string;
  projects: MarketingProject[];
}

export interface ProjectWorkspace {
  clients: MarketingClientWithProjects[];
  canManageProjects: boolean;
  canWriteEvents: boolean;
}

/** Event times are 'HH:MM' local wall-clock strings, never timestamps — see
 *  marketingEvent.service on the server for why. */
export interface MarketingEvent {
  id: number;
  projectId: number;
  title: string;
  date: string;                 // 'YYYY-MM-DD'
  startTime: string | null;     // 'HH:MM'
  endTime: string | null;       // 'HH:MM'
  eventType: string | null;
  eventTypeLabel: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  notes: string | null;
}

export interface EventTypeOption { key: string; label: string }

export interface ProjectEvents {
  events: MarketingEvent[];
  eventTypes: EventTypeOption[];
  canWriteEvents: boolean;
}

export interface EventPayload {
  title?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  eventType?: string | null;
  assigneeId?: number | null;
  notes?: string | null;
}

export async function fetchProjectWorkspace(): Promise<ProjectWorkspace> {
  const res = await apiClient.get<{ success: boolean } & ProjectWorkspace>('/marketing/projects');
  return {
    clients: res.data?.clients ?? [],
    canManageProjects: !!res.data?.canManageProjects,
    canWriteEvents: !!res.data?.canWriteEvents,
  };
}

export async function fetchProject(projectId: number): Promise<MarketingProject> {
  const res = await apiClient.get<{ success: boolean; project: MarketingProject }>(
    `/marketing/projects/${projectId}`,
  );
  return res.data.project;
}

export interface CreateProjectPayload {
  clientId: number;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export async function createProject(payload: CreateProjectPayload): Promise<MarketingProject> {
  const res = await apiClient.post<{ success: boolean; project: MarketingProject }>(
    '/marketing/projects', payload,
  );
  return res.data.project;
}

/** `from`/`to` narrow the fetch to the visible range; the project filter — not
 *  the range — is what scopes the result. */
export async function fetchProjectEvents(
  projectId: number, from?: string, to?: string,
): Promise<ProjectEvents> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  const res = await apiClient.get<{ success: boolean } & ProjectEvents>(
    `/marketing/projects/${projectId}/events${qs ? `?${qs}` : ''}`,
  );
  return {
    events: res.data?.events ?? [],
    eventTypes: res.data?.eventTypes ?? [],
    canWriteEvents: !!res.data?.canWriteEvents,
  };
}

export async function createProjectEvent(projectId: number, payload: EventPayload): Promise<MarketingEvent> {
  const res = await apiClient.post<{ success: boolean; event: MarketingEvent }>(
    `/marketing/projects/${projectId}/events`, payload,
  );
  return res.data.event;
}

export async function updateProjectEvent(
  projectId: number, eventId: number, payload: EventPayload,
): Promise<MarketingEvent> {
  const res = await apiClient.put<{ success: boolean; event: MarketingEvent }>(
    `/marketing/projects/${projectId}/events/${eventId}`, payload,
  );
  return res.data.event;
}

export async function deleteProjectEvent(projectId: number, eventId: number): Promise<void> {
  await apiClient.delete(`/marketing/projects/${projectId}/events/${eventId}`);
}
