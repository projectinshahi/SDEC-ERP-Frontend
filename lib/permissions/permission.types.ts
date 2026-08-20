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
  // My Tasks — standalone collaboration module (independent of task.* / sales.tasks.*)
  | 'mytasks.view'
  | 'mytasks.create'
  | 'mytasks.edit'
  | 'mytasks.delete'
  | 'mytasks.assign'
  | 'mytasks.chat.view'
  | 'mytasks.chat.send'
  | 'mytasks.dashboard.view'
  | 'mytasks.dashboard.export'
  // Notice — standalone top-level module
  | 'notice.view'
  | 'notice.create'
  | 'notice.manage'
  | 'notice.categories.manage'
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
  | 'sales.leads.export'
  | 'sales.leads.view_all'
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
  | 'sales.companies.view'
  | 'sales.companies.create'
  | 'sales.companies.edit'
  | 'sales.companies.delete'
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
  | 'sales.targets.history.view'
  | 'sales.reports.export'
  // Sales Tickets (independent per-action keys; mirror the Development tickets module)
  | 'sales.tickets.view'
  | 'sales.tickets.create'
  | 'sales.tickets.edit'
  | 'sales.tickets.delete'
  | 'sales.tickets.assign'


  | 'sales.meetings.view'
  | 'sales.meetings.create'
  | 'sales.meetings.edit'
  | 'sales.meetings.delete'
  | 'sales.meetings.schedule'
  // HR Module — coarse module-access masters (bridge to granular via hrGrants:
  // hr.view⇒*.view, hr.create⇒*.create, hr.edit⇒*.edit, hr.delete⇒*.delete).
  | 'hr.view'
  | 'hr.create'
  | 'hr.edit'
  | 'hr.delete'
  | 'hr.attendance' // legacy coarse attendance-write capability (Employee role)
  // HR — granular per-area permissions (1:1 with the sidebar + backend routes)
  | 'hr.dashboard.view'
  | 'hr.employees.view'
  | 'hr.employees.create'
  | 'hr.employees.edit'
  | 'hr.employees.delete'
  | 'hr.attendance.view'
  | 'hr.attendance.create'
  | 'hr.attendance.edit'
  | 'hr.attendance.delete'
  | 'hr.analytics.view'
  | 'hr.leave.view'
  | 'hr.leave.self'
  | 'hr.leave.approve'
  | 'hr.recruitment.view'
  | 'hr.recruitment.create'
  | 'hr.recruitment.edit'
  | 'hr.recruitment.delete'
  | 'hr.payroll.view'
  | 'hr.payroll.process'
  | 'hr.performance.view'
  | 'hr.performance.create'
  | 'hr.performance.review'
  | 'hr.performance.approve'
  | 'hr.documents.view'
  | 'hr.documents.create'
  | 'hr.documents.edit'
  | 'hr.documents.delete'
  | 'hr.settings.view'
  | 'hr.settings.edit'
  // Finance Module — independent ERP module (mirrors Sales/Development RBAC).
  // `finance.view` is the coarse module-access key; each page has its own View key;
  // Income & Expenses add create/edit/delete for full CRUD.
  | 'finance.view'
  | 'finance.dashboard.view'
  | 'finance.income.view'
  | 'finance.income.create'
  | 'finance.income.edit'
  | 'finance.income.delete'
  | 'finance.expenses.view'
  | 'finance.expenses.create'
  | 'finance.expenses.edit'
  | 'finance.expenses.delete'
  | 'finance.transactions.view'
  | 'finance.reports.view'
  | 'finance.settings.view'
  // Marketing Module — top-level ERP module (mirrors Sales/HR RBAC). Coarse module
  // access = holding ANY marketing.* key; each section has its own view + action keys.
  // Financial keys (budget/spend/expense/revenue/ROI) are separated so a role can be
  // granted operational access WITHOUT seeing money (enforced FE + BE).
  | 'marketing.dashboard.view'
  | 'marketing.dashboard.financials'
  | 'marketing.campaigns.view'
  | 'marketing.campaigns.create'
  | 'marketing.campaigns.edit'
  | 'marketing.campaigns.delete'
  | 'marketing.campaigns.archive'
  | 'marketing.campaigns.members.manage'
  | 'marketing.campaigns.financials.view'
  | 'marketing.campaigns.budget.manage'
  | 'marketing.campaigns.performance.view'
  | 'marketing.leads.view'
  | 'marketing.leads.view_all'
  | 'marketing.leads.create'
  | 'marketing.leads.edit'
  | 'marketing.leads.delete'
  | 'marketing.leads.import'
  | 'marketing.leads.export'
  | 'marketing.leads.assign'
  | 'marketing.leads.status.change'
  | 'marketing.leads.qualify'
  | 'marketing.leads.handoff'
  | 'marketing.leads.history.view'
  | 'marketing.sources.view'
  | 'marketing.sources.create'
  | 'marketing.sources.edit'
  | 'marketing.sources.delete'
  | 'marketing.content.view'
  | 'marketing.content.create'
  | 'marketing.content.edit'
  | 'marketing.content.delete'
  | 'marketing.content.approve'
  | 'marketing.content.publish'
  | 'marketing.content.schedule'
  | 'marketing.social.view'
  | 'marketing.social.create'
  | 'marketing.social.edit'
  | 'marketing.social.delete'
  | 'marketing.social.schedule'
  | 'marketing.social.publish'
  | 'marketing.social.analytics.view'
  | 'marketing.email.view'
  | 'marketing.email.create'
  | 'marketing.email.edit'
  | 'marketing.email.delete'
  | 'marketing.email.schedule'
  | 'marketing.email.send'
  | 'marketing.email.analytics.view'
  | 'marketing.email.templates.manage'
  | 'marketing.tasks.view'
  | 'marketing.tasks.create'
  | 'marketing.tasks.edit'
  | 'marketing.tasks.delete'
  | 'marketing.tasks.assign'
  | 'marketing.tasks.approve'
  | 'marketing.tasks.points.manage'
  | 'marketing.tasks.analytics.view'
  | 'marketing.calendar.view'
  | 'marketing.calendar.manage'
  | 'marketing.events.view'
  | 'marketing.events.create'
  | 'marketing.events.edit'
  | 'marketing.events.delete'
  | 'marketing.events.members.manage'
  | 'marketing.events.performance.view'
  | 'marketing.budget.view'
  | 'marketing.budget.create'
  | 'marketing.budget.edit'
  | 'marketing.budget.delete'
  | 'marketing.expenses.create'
  | 'marketing.expenses.edit'
  | 'marketing.expenses.delete'
  | 'marketing.expenses.approve'
  | 'marketing.financials.view'
  | 'marketing.analytics.view'
  | 'marketing.analytics.roi.view'
  | 'marketing.analytics.revenue.view'
  | 'marketing.analytics.export'
  | 'marketing.reports.view'
  | 'marketing.reports.generate'
  | 'marketing.reports.download'
  | 'marketing.reports.export';

/**
 * Module names used for sidebar filtering and route protection.
 * 'dashboard' is always accessible and has no permission gating.
 */
export type ModuleName = 'user' | 'task' | 'mytasks' | 'notice' | 'role' | 'dashboard' | 'bugs' | 'sprints' | 'blockers' | 'meetings' | 'project' | 'sales' | 'tickets' | 'hr' | 'finance' | 'marketing';

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


