/**
 * RBAC Permission Constants
 * Single source of truth for all permission definitions in the system.
 */

import type { PermissionKey, ModuleName, PermissionGroup } from './permission.types';

/**
 * Mapping of module names to their permission key prefixes.
 * Used for dynamic module access checks.
 */
export const MODULE_PREFIX_MAP: Record<Exclude<ModuleName, 'dashboard'>, string> = {
  user: 'user.',
  task: 'task.',
  role: 'role.',
  bugs: 'bugs.',
  tickets: 'tickets.',
  sprints: 'sprints.',
  blockers: 'blockers.',
  meetings: 'meetings.',
  project: 'project.',
  sales: 'sales.',
  hr: 'hr.',
  finance: 'finance.',
} as const;

/**
 * All permission groups organized by module.
 * Used in the Create/Edit Role modal for rendering categorized permission sections.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: [
      {
        key: 'dashboard.view',
        label: 'View Dashboard',
        description: 'View the Development dashboard home — controls the Dashboard sidebar tab',
        module: 'dashboard',
      },
    ],
  },
  {
    module: 'user',
    label: 'User Management',
    permissions: [
      {
        key: 'user.create',
        label: 'Create User',
        description: 'Create and provision new system users',
        module: 'user',
      },
      {
        key: 'user.read',
        label: 'Read User',
        description: 'View user profiles and directory listings',
        module: 'user',
      },
      {
        key: 'user.update',
        label: 'Edit User',
        description: 'Update profile and status details for existing users',
        module: 'user',
      },
      {
        key: 'user.delete',
        label: 'Delete User',
        description: 'Permanently remove system users from the database',
        module: 'user',
      },
    ],
  },
  {
    module: 'task',
    label: 'Task Management',
    permissions: [
      {
        key: 'task.create',
        label: 'Create Task',
        description: 'Create new operational tasks and assignments',
        module: 'task',
      },
      {
        key: 'task.read',
        label: 'View Boards',
        description: 'View Kanban boards, tasks and status updates — controls the Boards sidebar tab',
        module: 'task',
      },
      {
        key: 'task.update',
        label: 'Edit Task',
        description: 'Modify execution details and status of existing tasks',
        module: 'task',
      },
      {
        key: 'task.delete',
        label: 'Delete Task',
        description: 'Permanently remove operational tasks from the database',
        module: 'task',
      },
      {
        key: 'task.board.create',
        label: 'Create Board',
        description: 'Create new Kanban boards',
        module: 'task',
      },
      {
        key: 'task.board.edit',
        label: 'Edit Board',
        description: 'Modify existing Kanban boards',
        module: 'task',
      },
      {
        key: 'task.board.delete',
        label: 'Delete/Reset Board',
        description: 'Reset or delete Kanban boards',
        module: 'task',
      },
      {
        key: 'task.column.create',
        label: 'Create Column',
        description: 'Add new status columns to the Kanban board',
        module: 'task',
      },
      {
        key: 'task.column.update',
        label: 'Edit Column',
        description: 'Rename status columns on the Kanban board',
        module: 'task',
      },
      {
        key: 'task.column.delete',
        label: 'Delete Column',
        description: 'Remove status columns from the Kanban board',
        module: 'task',
      },
    ],
  },
  {
    module: 'role',
    label: 'Role Management',
    permissions: [
      {
        key: 'role.create',
        label: 'Create Role',
        description: 'Define new security roles with custom permission sets',
        module: 'role',
      },
      {
        key: 'role.read',
        label: 'Read Role',
        description: 'View role definitions and their assigned permissions',
        module: 'role',
      },
      {
        key: 'role.update',
        label: 'Edit Role',
        description: 'Modify existing role configurations and permissions',
        module: 'role',
      },
      {
        key: 'role.delete',
        label: 'Delete Role',
        description: 'Permanently remove security roles from the system',
        module: 'role',
      },
    ],
  },
  {
    module: 'bugs',
    label: 'Bug Tracking',
    permissions: [
      {
        key: 'bugs.create',
        label: 'Create Bug',
        description: 'Report new bugs and issues',
        module: 'bugs',
      },
      {
        key: 'bugs.read',
        label: 'Read Bug',
        description: 'View bug tracking boards and details',
        module: 'bugs',
      },
      {
        key: 'bugs.update',
        label: 'Edit Bug',
        description: 'Update bug status, priority, and details',
        module: 'bugs',
      },
      {
        key: 'bugs.delete',
        label: 'Delete Bug',
        description: 'Permanently remove bugs from the database',
        module: 'bugs',
      },
    ],
  },
  {
    module: 'sprints',
    label: 'Sprint Tracking',
    permissions: [
      {
        key: 'sprints.create',
        label: 'Create Sprint',
        description: 'Create and plan new sprints',
        module: 'sprints',
      },
      {
        key: 'sprints.read',
        label: 'Read Sprint',
        description: 'View sprint boards and details',
        module: 'sprints',
      },
      {
        key: 'sprints.update',
        label: 'Edit Sprint',
        description: 'Update sprint status, details, and assignments',
        module: 'sprints',
      },
      {
        key: 'sprints.delete',
        label: 'Delete Sprint',
        description: 'Permanently remove sprints from the database',
        module: 'sprints',
      },
      {
        key: 'sprints.analytics',
        label: 'View Analytics',
        description: 'Access detailed sprint performance analytics and charts',
        module: 'sprints',
      },
      {
        key: 'sprints.status.manage',
        label: 'Sprint Status Management',
        description: 'Create, edit and change sprint status/workflow (Project → Sprint Management). Without it, sprints are view-only.',
        module: 'sprints',
      },
    ],
  },
  {
    // Labelled "Tickets" to match the sidebar tab (the "Tickets" item routes to
    // /dashboard/blockers and is gated on blockers.read). Keys stay blockers.*
    // (unchanged backend contract); descriptions keep the underlying term.
    module: 'blockers',
    label: 'Tickets',
    permissions: [
      {
        key: 'blockers.create',
        label: 'Create Ticket',
        description: 'Log new tickets / blockers and escalation requests',
        module: 'blockers',
      },
      {
        key: 'blockers.read',
        label: 'View Tickets',
        description: 'View the Tickets (Blockers) dashboard and details — controls the Tickets sidebar tab',
        module: 'blockers',
      },
      {
        key: 'blockers.update',
        label: 'Edit Ticket',
        description: 'Update ticket / blocker status, severity, and details',
        module: 'blockers',
      },
      {
        key: 'blockers.delete',
        label: 'Delete Ticket',
        description: 'Permanently remove tickets / blockers from the system',
        module: 'blockers',
      },
      {
        key: 'blockers.resolve',
        label: 'Resolve Ticket',
        description: 'Mark tickets / blockers as resolved or closed',
        module: 'blockers',
      },
    ],
  },
  {
    module: 'meetings',
    label: 'Meetings',
    permissions: [
      {
        key: 'meetings.create',
        label: 'Create Meeting',
        description: 'Schedule and create new meetings',
        module: 'meetings',
      },
      {
        key: 'meetings.read',
        label: 'View Meetings',
        description: 'Access the meetings dashboard and calendar',
        module: 'meetings',
      },
      {
        key: 'meetings.update',
        label: 'Edit Meeting',
        description: 'Update meeting details and attendees',
        module: 'meetings',
      },
      {
        key: 'meetings.delete',
        label: 'Delete Meeting',
        description: 'Cancel meetings and delete action items',
        module: 'meetings',
      },
    ],
  },
  {
    module: 'project',
    label: 'Project Management',
    permissions: [
      {
        key: 'project.view',
        label: 'View Projects',
        description: 'View project details and listings',
        module: 'project',
      },
      {
        key: 'project.create',
        label: 'Create Projects',
        description: 'Create and setup new projects',
        module: 'project',
      },
      {
        key: 'project.edit',
        label: 'Edit Projects',
        description: 'Update project configurations and details',
        module: 'project',
      },
      {
        key: 'project.delete',
        label: 'Delete Projects',
        description: 'Archive and permanently remove projects',
        module: 'project',
      },
      {
        key: 'project.manage_members',
        label: 'Manage Members',
        description: 'Add, edit, or remove project members',
        module: 'project',
      },
      {
        key: 'project.analytics',
        label: 'View Analytics',
        description: 'Access project analytics and reports',
        module: 'project',
      },
      {
        key: 'project.developer_performance',
        label: 'View Developer Performance',
        description: 'View the developer performance analytics dashboard',
        module: 'project',
      },
    ],
  },
  // ── Sales — grouped by area (mirrors the Development module's multi-group
  //    structure). The coarse keys (sales.view/edit/…) are RETAINED for the
  //    existing route enforcement; the per-area keys add granular role config.
  {
    module: 'sales',
    label: 'Sales · Dashboard',
    permissions: [
      { key: 'sales.dashboard.view', label: 'View Dashboard', description: 'Open the Sales dashboard / command center', module: 'sales' },
      { key: 'sales.dashboard.analytics', label: 'View Analytics', description: 'View sales analytics, charts and KPIs', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Leads',
    permissions: [
      { key: 'sales.leads.view', label: 'View Leads', description: 'View leads and lead details', module: 'sales' },
      { key: 'sales.leads.create', label: 'Create Leads', description: 'Add new leads', module: 'sales' },
      { key: 'sales.leads.edit', label: 'Edit Leads', description: 'Update lead details and status', module: 'sales' },
      { key: 'sales.leads.delete', label: 'Delete Leads', description: 'Remove leads', module: 'sales' },
      { key: 'sales.leads.analytics', label: 'View Lead Analytics', description: 'Open the Lead Analytics dashboard (scores, conversion, interactions). Independent of View Leads.', module: 'sales' },
      { key: 'sales.leads.pipeline.manage', label: 'Manage Lead Pipeline Columns', description: 'Add, rename, reorder the lead pipeline (Kanban) stage columns. Independent of editing leads.', module: 'sales' },
      { key: 'sales.leads.pipeline.delete', label: 'Delete Lead Pipeline Columns', description: 'Delete lead pipeline stage columns (leads are safely moved to another stage first).', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Deals',
    permissions: [
      { key: 'sales.deals.view', label: 'View Deals', description: 'View deals and deal details', module: 'sales' },
      { key: 'sales.deals.create', label: 'Create Deals', description: 'Add new deals', module: 'sales' },
      { key: 'sales.deals.edit', label: 'Edit Deals', description: 'Update deals and advance stages', module: 'sales' },
      { key: 'sales.deals.delete', label: 'Delete Deals', description: 'Remove deals', module: 'sales' },
      { key: 'sales.deals.pipeline.manage', label: 'Manage Deal Pipeline Columns', description: 'Add, rename, reorder the deal pipeline (Kanban) stage columns. Independent of editing deals.', module: 'sales' },
      { key: 'sales.deals.pipeline.delete', label: 'Delete Deal Pipeline Columns', description: 'Delete deal pipeline stage columns (deals are safely moved to another stage first).', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Pipeline',
    permissions: [
      { key: 'sales.pipeline.view', label: 'View Pipeline', description: 'View the leads / deals pipeline board', module: 'sales' },
      { key: 'sales.pipeline.manage', label: 'Manage Pipeline', description: 'Move records and manage pipeline stages', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Contacts',
    permissions: [
      { key: 'sales.contacts.view', label: 'View Contacts', description: 'View contacts and contact details', module: 'sales' },
      { key: 'sales.contacts.create', label: 'Create Contacts', description: 'Add new contacts', module: 'sales' },
      { key: 'sales.contacts.edit', label: 'Edit Contacts', description: 'Update contact information', module: 'sales' },
      { key: 'sales.contacts.delete', label: 'Delete Contacts', description: 'Remove contacts', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Follow-ups',
    permissions: [
      { key: 'sales.followups.view', label: 'View Follow-ups', description: 'View the Follow-up Center', module: 'sales' },
      { key: 'sales.followups.create', label: 'Create Follow-ups', description: 'Schedule new follow-ups', module: 'sales' },
      { key: 'sales.followups.edit', label: 'Edit Follow-ups', description: 'Reschedule or update follow-ups', module: 'sales' },
      { key: 'sales.followups.complete', label: 'Complete Follow-ups', description: 'Mark follow-ups as completed', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Team',
    permissions: [
      { key: 'sales.teams.view', label: 'View Teams', description: 'View sales teams and members', module: 'sales' },
      { key: 'sales.teams.create', label: 'Create Teams', description: 'Create new sales teams', module: 'sales' },
      { key: 'sales.teams.edit', label: 'Edit Teams', description: 'Edit teams and membership', module: 'sales' },
      { key: 'sales.teams.delete', label: 'Delete Teams', description: 'Archive / remove sales teams', module: 'sales' },
      { key: 'sales.team.manage', label: 'Manage Teams (full)', description: 'Create, edit and archive sales teams and manage membership', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Tasks',
    permissions: [
      { key: 'sales.tasks.view', label: 'View Sales Tasks', description: 'View the Sales Tasks workspace and own/assigned tasks', module: 'sales' },
      { key: 'sales.tasks.create', label: 'Create Sales Tasks', description: 'Create new sales tasks', module: 'sales' },
      { key: 'sales.tasks.edit', label: 'Edit Sales Tasks', description: 'Update sales tasks (status, details, blockers)', module: 'sales' },
      { key: 'sales.tasks.delete', label: 'Delete Sales Tasks', description: 'Remove sales tasks', module: 'sales' },
      { key: 'sales.tasks.complete', label: 'Complete Sales Tasks', description: 'Complete sales tasks with an outcome', module: 'sales' },
      { key: 'sales.tasks.team.view', label: 'View Team Tasks', description: 'View the team-wide task breakdown', module: 'sales' },
      { key: 'sales.tasks.team.update', label: 'Update Team Task Status', description: 'Update task status from the Team Tasks view', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Tickets',
    permissions: [
      { key: 'sales.tickets.view', label: 'View Tickets', description: 'View the Sales Tickets workspace (own + assigned tickets) — controls the Tickets sidebar tab', module: 'sales' },
      { key: 'sales.tickets.create', label: 'Create Tickets', description: 'Create new sales tickets', module: 'sales' },
      { key: 'sales.tickets.edit', label: 'Edit Tickets', description: 'Update sales ticket status, priority and details', module: 'sales' },
      { key: 'sales.tickets.delete', label: 'Delete Tickets', description: 'Permanently remove sales tickets', module: 'sales' },
      { key: 'sales.tickets.assign', label: 'Assign Tickets', description: 'Assign or reassign a sales ticket to another user. Independent of editing.', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Meetings',
    permissions: [
      { key: 'sales.meetings.view', label: 'View Meetings', description: 'View the Sales Meetings workspace (own + participating meetings) — controls the Meetings sidebar tab', module: 'sales' },
      { key: 'sales.meetings.create', label: 'Create Meetings', description: 'Create new sales meetings', module: 'sales' },
      { key: 'sales.meetings.edit', label: 'Edit Meetings', description: 'Update meeting details, participants and notes', module: 'sales' },
      { key: 'sales.meetings.delete', label: 'Delete Meetings', description: 'Cancel / delete sales meetings', module: 'sales' },
      { key: 'sales.meetings.schedule', label: 'Schedule Meetings', description: 'Schedule sales meetings (with Google Meet links). Independent grant for scheduling.', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Targets',
    permissions: [
      { key: 'sales.targets.view', label: 'View Targets', description: 'View revenue targets and achievement', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Reports',
    permissions: [
      { key: 'sales.reports.view', label: 'View Reports', description: 'Organization-wide reporting and executive analytics visibility', module: 'sales' },
      { key: 'sales.reports.export', label: 'Export Reports', description: 'Export sales reports (CSV / PDF)', module: 'sales' },
    ],
  },
  {
    module: 'sales',
    label: 'Sales · Access & Configuration',
    permissions: [
      { key: 'sales.view', label: 'Full Sales Access (all tabs)', description: 'Master key that unlocks EVERY Sales tab at once. For per-tab control, leave this OFF and grant the individual "View …" permissions in the Sales groups above instead.', module: 'sales' },
      { key: 'sales.create', label: 'Create Sales Entities', description: 'Create new leads, opportunities, and deals', module: 'sales' },
      { key: 'sales.edit', label: 'Edit Sales Entities', description: 'Modify existing sales data and advance pipelines', module: 'sales' },
      { key: 'sales.delete', label: 'Delete Sales Entities', description: 'Permanently remove sales records', module: 'sales' },
      { key: 'sales.assign', label: 'Assign Leads', description: 'Assign or reassign leads to Business Development Executives', module: 'sales' },
      { key: 'sales.scoring', label: 'Manage Lead Scoring', description: 'Configure lead scoring criteria and weights (Admin)', module: 'sales' },
      { key: 'sales.approve', label: 'Approve Documents', description: 'Approve, reject or request rework on submitted client documents', module: 'sales' },
      { key: 'sales.config', label: 'Configure Pipeline', description: 'Configure stalled-deal thresholds and pipeline settings', module: 'sales' },
      { key: 'sales.targets.manage', label: 'Manage Targets', description: "Set and edit other team members' performance targets", module: 'sales' },
      { key: 'sales.incentive.manage', label: 'Manage Incentives', description: 'Configure per-BDE incentive slab structures', module: 'sales' },
    ],
  },
  {
    module: 'hr',
    label: 'HR Management',
    permissions: [
      { key: 'hr.view', label: 'View HR Module', description: 'General access to the HR module', module: 'hr' },
      { key: 'hr.dashboard.view', label: 'View HR Dashboard', description: 'Access the HR dashboard overview', module: 'hr' },
      { key: 'hr.employees.view', label: 'View Employees', description: 'View workforce employees directory', module: 'hr' },
      { key: 'hr.attendance.view', label: 'View Attendance', description: 'View workforce attendance logs', module: 'hr' },
      { key: 'hr.leave.view', label: 'View Leave', description: 'View and manage employee leave requests', module: 'hr' },
      { key: 'hr.recruitment.view', label: 'View Recruitment', description: 'Access hiring and recruitment pipelines', module: 'hr' },
      { key: 'hr.payroll.view', label: 'View Payroll', description: 'View payroll and financial details', module: 'hr' },
      { key: 'hr.performance.view', label: 'View Performance', description: 'View employee performance reviews and cycles', module: 'hr' },
      { key: 'hr.performance.create', label: 'Create Performance Appraisal / Cycle', description: 'Create and assign performance review cycles', module: 'hr' },
      { key: 'hr.performance.review', label: 'Submit Performance Review', description: 'Evaluate and review assigned employee appraisals', module: 'hr' },
      { key: 'hr.performance.approve', label: 'Approve Performance Appraisal', description: 'Approve and finalize employee performance appraisals', module: 'hr' },
      { key: 'hr.documents.view', label: 'View Documents', description: 'Access HR documents and files', module: 'hr' },
      { key: 'hr.settings.view', label: 'View Settings', description: 'Access HR module settings', module: 'hr' },
    ],
  },
];

/**
 * Flat array of all valid permission keys in the system.
 * Derived from PERMISSION_GROUPS to maintain single source of truth.
 */
export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((p) => p.key)
);

/**
 * The role name that receives Super Admin privileges.
 * Super Admin bypasses all permission checks.
 */
export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

