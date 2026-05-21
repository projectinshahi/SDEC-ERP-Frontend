/**
 * Application-wide constants
 */

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const API_TIMEOUT = 10000; // 10 seconds

// Navigation Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TASKS: '/dashboard/tasks',
  USER_MANAGEMENT: '/dashboard/user-management',
  ROLES: '/dashboard/user-management/roles',
  USERS: '/dashboard/user-management/users',
} as const;

// Menu Items Configuration
export const SIDEBAR_MENU = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
  },
  {
    label: 'User Management',
    href: ROUTES.USER_MANAGEMENT,
    icon: 'Users',
  },
  {
    label: 'Tasks',
    href: ROUTES.TASKS,
    icon: 'CheckSquare',
  },
] as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Unauthorized. Please log in.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,
} as const;

// Task Status Options
export const TASK_STATUS = ['pending', 'in-progress', 'completed', 'cancelled'] as const;

// Task Priority Options
export const TASK_PRIORITY = ['low', 'medium', 'high'] as const;
