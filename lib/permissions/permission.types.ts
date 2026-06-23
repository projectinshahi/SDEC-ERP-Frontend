/**
 * RBAC Permission Type Definitions
 * Central type system for all permission-related interfaces.
 */

/**
 * All valid permission keys in the system.
 * Format: `module.action`
 */
export type PermissionKey =
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
  | 'sales.deals.view'
  | 'sales.deals.create'
  | 'sales.deals.edit'
  | 'sales.deals.delete'
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
  | 'sales.reports.export';

/**
 * Module names used for sidebar filtering and route protection.
 * 'dashboard' is always accessible and has no permission gating.
 */
export type ModuleName = 'user' | 'task' | 'role' | 'dashboard' | 'bugs' | 'sprints' | 'blockers' | 'meetings' | 'project' | 'sales' | 'tickets';

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


