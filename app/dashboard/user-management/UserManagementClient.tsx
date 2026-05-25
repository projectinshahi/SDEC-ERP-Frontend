'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { UserTable } from '@/components/user-management/UserTable';
import { RoleTable } from '@/components/user-management/RoleTable';
import { AddUserModal } from '@/components/user-management/AddUserModal';
import { AddRoleModal } from '@/components/user-management/AddRoleModal';
import { CreateRoleModal } from '@/components/user-management/CreateRoleModal';
import { Modal } from '@/components/Modal';
import { Plus, Users, Shield, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { DUMMY_ROLES, AVAILABLE_PERMISSIONS } from '@/lib/data/user-management-data';
import type { User, Role, UserFormData, RoleFormData } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';
import { 
  fetchUsers, 
  createUserApi, 
  updateUserApi, 
  deleteUserApi 
} from '@/lib/api/users';
import { fetchRolesApi, deleteRoleApi } from '@/lib/api/roles';


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
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Deletion custom modal states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [isDeletingRole, setIsDeletingRole] = useState<boolean>(false);



  // Custom UX loading states & toasts queue
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);



  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      const formatted = data.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        roles: u.role ? u.role.split(',').map((r: string) => r.trim()) : [],
        status: String(u.status).toLowerCase() as 'active' | 'inactive',
        createdAt: new Date().toISOString().split('T')[0],
      }));
      setUsers(formatted);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showToast('Failed to sync users with database', 'error');
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchRolesApi();
      const formatted = data.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        description: r.description || '',
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
        userCount: r.userCount || 0,
      }));
      setRoles(formatted);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      showToast('Failed to sync roles with database', 'error');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadUsers(), loadRoles()]);
      setIsLoading(false);
    };
    init();
  }, []);

  // User handlers
  const handleAddUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await createUserApi(data);
      showToast(`User "${data.name}" successfully created!`, 'success');
      setIsUserModalOpen(false);
      loadUsers(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error creating user:', err);
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (editingUser) {
      setIsSubmitting(true);
      try {
        await updateUserApi(editingUser.id, data);
        showToast(`User profile for "${data.name}" successfully updated!`, 'success');
        setIsUserModalOpen(false);
        setEditingUser(null);
        loadUsers(); // Refresh dynamic list from Neon DB
      } catch (err: any) {
        console.error('Error updating user:', err);
        showToast(err.message || 'Failed to update user profile', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteUserApi(userToDelete.id);
      showToast(`User "${userToDelete.name}" has been deleted.`, 'info');
      setUserToDelete(null);
      loadUsers(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeletingUser(false);
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
    if (!role) return;
    setRoleToDelete(role);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await deleteRoleApi(roleToDelete.id);
      showToast('Role deleted successfully', 'success');
      setRoleToDelete(null);
      loadRoles(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error deleting role:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to delete role';
      showToast(
        errMsg === 'Cannot delete role. It is assigned to active users.'
          ? 'Cannot delete role. This role is assigned to users.'
          : errMsg,
        'error'
      );
    } finally {
      setIsDeletingRole(false);
    }
  };

  const availableRoleNames = roles.map((r) => r.name);

  return (
    <>
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
        <div className="flex items-center gap-2">

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

      <CreateRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSubmitSuccess={loadRoles}
        roleToEdit={editingRole}
      />

      {/* Custom Delete User Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => !isDeletingUser && setUserToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          {/* Circular Alert Icon */}
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>

          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            Delete User Account?
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete user <span className="font-semibold text-gray-800">"{userToDelete?.name}"</span>? This action cannot be undone and will revoke all access immediately.
          </p>

          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => setUserToDelete(null)}
              disabled={isDeletingUser}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-semibold"
              onClick={handleConfirmDeleteUser}
              isLoading={isDeletingUser}
            >
              {isDeletingUser ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Delete Role Confirmation Modal */}
      <Modal
        isOpen={!!roleToDelete}
        onClose={() => !isDeletingRole && setRoleToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          {/* Circular Alert Icon */}
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>

          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            Delete Security Role?
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete role <span className="font-semibold text-gray-800">"{roleToDelete?.name}"</span>? This action cannot be undone.
            {roleToDelete?.userCount ? (
              <span className="block mt-4 p-3 rounded-lg border border-red-100 bg-red-50/50 text-red-700 text-xs font-semibold text-left animate-shake">
                ⚠️ This role is currently assigned to {roleToDelete.userCount} active user{roleToDelete.userCount > 1 ? 's' : ''}. You will not be able to delete it.
              </span>
            ) : (
              <span className="block mt-4 p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-xs font-semibold text-left">
                ✓ This role is not currently assigned to any active users.
              </span>
            )}
          </p>

          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => setRoleToDelete(null)}
              disabled={isDeletingRole}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-semibold"
              onClick={handleConfirmDeleteRole}
              isLoading={isDeletingRole}
              disabled={!!roleToDelete?.userCount}
            >
              {isDeletingRole ? 'Deleting...' : 'Delete Role'}
            </Button>
          </div>
        </div>
      </Modal>



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
    </>
  );
}

