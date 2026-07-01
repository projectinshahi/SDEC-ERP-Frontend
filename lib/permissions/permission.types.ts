/**
 * RBAC Permission Type Definitions
 * Central type system for all permission-related interfaces.
 */

/**
 * All valid permission keys in the system.
 * Format: `module.action`
 */
export type PermissionKey =
  // Dashboard (Development home) — its own View permission so the Dashboard tab
  // is hidden/blocked unless explicitly granted (strict RBAC).
  | 'dashboard.view'
  // User Management
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  // Task Management
  | 'task.create'
  | 'task.read'
  | 'task.update'
  | 'task.delete'
  | 'task.board.create'
  | 'task.board.edit'
  | 'task.board.delete'
  | 'task.column.create'
  | 'task.column.update'
  | 'task.column.delete'
  // Role Management
  | 'role.create'
  | 'role.read'
  | 'role.update'
  | 'role.delete'
  // Bug Tracking
  | 'bugs.create'
  | 'bugs.read'
  | 'bugs.update'
  | 'bugs.delete'
  | 'tickets.create'
  | 'tickets.read'
  | 'tickets.update'
  | 'tickets.delete'
  // Sprint Tracking
  | 'sprints.create'
  | 'sprints.read'
  | 'sprints.update'
  | 'sprints.delete'
  | 'sprints.analytics'
  | 'sprints.status.manage'
  // Blocker Tracking
  | 'blockers.create'
  | 'blockers.read'
  | 'blockers.update'
  | 'blockers.delete'
  | 'blockers.resolve'
  // Meetings
  | 'meetings.create'
  | 'meetings.read'
  | 'meetings.update'
  | 'meetings.delete'
  // Project Management
  | 'project.view'
  | 'project.create'
  | 'project.edit'
  | 'project.delete'
  | 'project.manage_members'
  | 'project.analytics'
  | 'project.developer_performance'
  // Sales Module — coarse access & configuration (enforced by existing routes)
  | 'sales.view'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.delete'
  | 'sales.assign'
  | 'sales.scoring'
  | 'sales.approve'
  | 'sales.config'
  | 'sales.team.manage'
  | 'sales.targets.manage'
  | 'sales.incentive.manage'
  | 'sales.reports.view'
  // Sales Module — granular per-area permissions (grouped in Role Management)
  | 'sales.dashboard.view'
  | 'sales.dashboard.analytics'
  | 'sales.leads.view'
  | 'sales.leads.create'
  | 'sales.leads.edit'
  | 'sales.leads.delete'
  | 'sales.leads.analytics'
  | 'sales.leads.pipeline.manage'
  | 'sales.leads.pipeline.delete'
  | 'sales.deals.view'
  | 'sales.deals.create'
  | 'sales.deals.edit'
  | 'sales.deals.delete'
  | 'sales.deals.pipeline.manage'
  | 'sales.deals.pipeline.delete'
  | 'sales.pipeline.view'
  | 'sales.pipeline.manage'
  | 'sales.contacts.view'
  | 'sales.contacts.create'
  | 'sales.contacts.edit'
  | 'sales.contacts.delete'
  | 'sales.followups.view'
  | 'sales.followups.create'
  | 'sales.followups.edit'
  | 'sales.followups.complete'
  | 'sales.teams.view'
  | 'sales.teams.create'
  | 'sales.teams.edit'
  | 'sales.teams.delete'
  | 'sales.tasks.view'
  | 'sales.tasks.create'
  | 'sales.tasks.edit'
  | 'sales.tasks.delete'
  | 'sales.tasks.complete'
  | 'sales.tasks.team.view'
  | 'sales.tasks.team.update'
  | 'sales.targets.view'
  | 'sales.reports.export'
  // HR Module
  | 'hr.view'
  | 'hr.dashboard.view'
  | 'hr.employees.view'
  | 'hr.attendance.view'
  | 'hr.leave.view'
  | 'hr.leave.self'
  | 'hr.recruitment.view'
  | 'hr.payroll.view'
  | 'hr.performance.view'
  | 'hr.performance.create'
  | 'hr.performance.review'
  | 'hr.performance.approve'
  | 'hr.documents.view'
  | 'hr.settings.view';

/**
 * Module names used for sidebar filtering and route protection.
 * 'dashboard' is always accessible and has no permission gating.
 */
export type ModuleName = 'user' | 'task' | 'role' | 'dashboard' | 'bugs' | 'sprints' | 'blockers' | 'meetings' | 'project' | 'sales' | 'tickets' | 'hr' | 'finance';

/**
 * A single permission definition with metadata for UI rendering.
 */
export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  module: ModuleName;
}

/**
 * A group of permissions belonging to a module, used for
 * rendering categorized permission sections in the Create/Edit Role modal.
 */
export interface PermissionGroup {
  module: ModuleName;
  label: string;
  permissions: PermissionDefinition[];
}

/**
 * Extended user interface that includes RBAC fields.
 * This extends the basic auth user with role name and permissions.
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
}


