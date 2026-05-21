'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { UserTable } from '@/components/user-management/UserTable';
import { RoleTable } from '@/components/user-management/RoleTable';
import { AddUserModal } from '@/components/user-management/AddUserModal';
import { AddRoleModal } from '@/components/user-management/AddRoleModal';
import { Plus, Users, Shield, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { DUMMY_USERS, DUMMY_ROLES, AVAILABLE_PERMISSIONS } from '@/lib/data/user-management-data';
import type { User, Role, UserFormData, RoleFormData } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

type TabType = 'users' | 'roles';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/**
 * User Management Client Component
 */
export function UserManagementClient() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);
  const [roles, setRoles] = useState<Role[]>(DUMMY_ROLES);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Custom UX loading states & toasts queue
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // User handlers
  const handleAddUser = (data: UserFormData) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newUser: User = {
        id: String(users.length + 1),
        ...data,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [...prev, newUser]);
      setIsSubmitting(false);
      setIsUserModalOpen(false);
      showToast(`User "${data.name}" successfully created!`, 'success');
    }, 700);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleUpdateUser = (data: UserFormData) => {
    if (editingUser) {
      setIsSubmitting(true);
      setTimeout(() => {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...data } : u)));
        setIsSubmitting(false);
        setIsUserModalOpen(false);
        setEditingUser(null);
        showToast(`User profile for "${data.name}" successfully updated!`, 'success');
      }, 700);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user && confirm(`Are you sure you want to permanently delete user "${user.name}"?`)) {
      setIsLoading(true);
      setTimeout(() => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setIsLoading(false);
        showToast(`User "${user.name}" has been deleted.`, 'info');
      }, 600);
    }
  };

  // Role handlers
  const handleAddRole = (data: RoleFormData) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newRole: Role = {
        id: String(roles.length + 1),
        ...data,
        userCount: 0,
      };
      setRoles((prev) => [...prev, newRole]);
      setIsSubmitting(false);
      setIsRoleModalOpen(false);
      showToast(`Role "${data.name}" successfully created!`, 'success');
    }, 700);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = (data: RoleFormData) => {
    if (editingRole) {
      setIsSubmitting(true);
      setTimeout(() => {
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...r, ...data } : r)));
        setIsSubmitting(false);
        setIsRoleModalOpen(false);
        setEditingRole(null);
        showToast(`Access permission role "${data.name}" successfully updated!`, 'success');
      }, 700);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role && confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      setIsLoading(true);
      setTimeout(() => {
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        setIsLoading(false);
        showToast(`Security role "${role.name}" has been deleted.`, 'info');
      }, 600);
    }
  };

  const availableRoleNames = roles.map((r) => r.name);

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'User Management' }]} />
      </div>

      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, access controls, and custom security roles in your system.</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            if (activeTab === 'users') {
              setEditingUser(null);
              setIsUserModalOpen(true);
            } else {
              setEditingRole(null);
              setIsRoleModalOpen(true);
            }
          }}
        >
          <Plus size={20} />
          {activeTab === 'users' ? 'Add User' : 'Add Role'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('users')}
              className={classNames(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-colors cursor-pointer',
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Users size={20} />
              Users
              <span
                className={classNames(
                  'ml-2 py-0.5 px-2 rounded-full text-xs font-bold',
                  activeTab === 'users' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-600'
                )}
              >
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={classNames(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-colors cursor-pointer',
                activeTab === 'roles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Shield size={20} />
              Roles
              <span
                className={classNames(
                  'ml-2 py-0.5 px-2 rounded-full text-xs font-bold',
                  activeTab === 'roles' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-600'
                )}
              >
                {roles.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <Card variant="outlined" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center bg-white flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 font-bold text-xs mt-4">Refreshing records matrix...</p>
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <UserTable users={users} onEdit={handleEditUser} onDelete={handleDeleteUser} />
            )}
            {activeTab === 'roles' && (
              <div className="p-6 bg-white">
                <RoleTable roles={roles} onEdit={handleEditRole} onDelete={handleDeleteRole} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Overhauled Add/Edit Modals */}
      <AddUserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
        availableRoles={availableRoleNames}
        editUser={editingUser}
        isSubmitting={isSubmitting}
      />

      <AddRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSubmit={editingRole ? handleUpdateRole : handleAddRole}
        availablePermissions={AVAILABLE_PERMISSIONS}
        editRole={editingRole}
        isSubmitting={isSubmitting}
      />

      {/* Dynamic Toast Floating Queue */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={classNames(
              'pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border animate-slide-in-right bg-white',
              toast.type === 'success'
                ? 'border-green-100 text-green-800'
                : toast.type === 'error'
                  ? 'border-red-100 text-red-800'
                  : 'border-blue-100 text-blue-800'
            )}
            role="alert"
          >
            {/* Action status icon */}
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircle2 size={16} />
                </div>
              ) : toast.type === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <AlertTriangle size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <Info size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 text-xs font-bold leading-normal">{toast.message}</div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

