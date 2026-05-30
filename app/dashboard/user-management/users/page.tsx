'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ROUTES } from '@/lib/constants';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  RotateCw, 
  AlertCircle 
} from 'lucide-react';
import type { User, UserFormData } from '@/lib/types/user-management';
import { AddUserModal } from '@/components/user-management/AddUserModal';
import { Modal } from '@/components/Modal';
import { 
  fetchUsers, 
  createUserApi, 
  updateUserApi, 
  deleteUserApi 
} from '@/lib/api/users';
import { classNames } from '@/lib/utils';

/**
 * Live Users page - connects directly to Neon PostgreSQL database with fully responsive features
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal and editing states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion custom modal states
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      const formatted = data.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        roles: u.role ? u.role.split(',').map((r: string) => r.trim()) : ['User'],
        status: String(u.status).toLowerCase() as 'active' | 'inactive',
        createdAt: u.createdAt 
          ? new Date(u.createdAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      }));
      setUsers(formatted);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to sync users with the database. Check connection URL.');
      toast('Failed to sync users with database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // CRUD Actions
  const handleAddUser = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await createUserApi(data);
      toast(`User "${data.name}" successfully created!`, 'success');
      setIsModalOpen(false);
      loadUsers(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateUserApi(editingUser.id, data);
      toast(`User profile for "${data.name}" successfully updated!`, 'success');
      setIsModalOpen(false);
      setEditingUser(null);
      loadUsers(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast(err.message || 'Failed to update user profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserApi(userToDelete.id);
      toast(`User "${userToDelete.name}" has been deleted.`, 'info');
      setUserToDelete(null);
      loadUsers(); // Refresh dynamic list from Neon DB
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast(err.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusConfig = (statusStr: string) => {
    const s = String(statusStr).toLowerCase();
    if (s === 'active') {
      return {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm',
      };
    }
    return {
      label: 'Inactive',
      className: 'bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-sm',
    };
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'User Management', href: ROUTES.USER_MANAGEMENT },
            { label: 'Users' },
          ]}
        />
      </div>

      {/* Page Header */}
      <section className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Users</h1>
          <p className="text-gray-500 mt-2 text-sm">Manage system users and authorization directly on the live database.</p>
        </div>
        <Button 
          variant="primary" 
          size="lg"
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={20} />
          Add User
        </Button>
      </section>

      {/* Main content table card */}
      <Card variant="outlined" className="overflow-hidden">
        <CardHeader className="flex justify-between items-center border-b border-gray-100 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">All System Users</h2>
          {!isLoading && !error && (
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shadow-sm">
              {users.length} Total
            </span>
          )}
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {isLoading ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-50/30">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-48" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-slate-100 rounded-md animate-pulse w-14" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-5 bg-slate-100 rounded-full animate-pulse w-16" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : error ? (
            <div className="text-center py-16 bg-white p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3 border border-rose-100 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <p className="text-gray-800 font-bold text-sm">Failed to load users</p>
              <p className="text-gray-400 text-xs mt-1 mb-5 max-w-md">{error}</p>
              <Button variant="primary" size="sm" onClick={loadUsers}>
                <RotateCw size={16} className="mr-2 animate-spin-hover" />
                Try Reconnecting
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 bg-white p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-bold text-sm">No users found</p>
              <p className="text-gray-400 text-xs mt-1">There are no user accounts matching this criteria in the database.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => {
                  const statusConfig = getStatusConfig(user.status);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/45 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800 text-sm">{user.name}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-sm font-medium">
                        {user.email}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((r, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wide uppercase border border-slate-200/50 shadow-sm"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={statusConfig.className}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                        {user.createdAt}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="Edit user settings"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Permanently delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
        <CardFooter className="border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">
              Showing {isLoading || error ? 0 : users.length} of {isLoading || error ? 0 : users.length} entries
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Add / Edit User Modal */}
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
        availableRoles={['Admin', 'Manager', 'Employee']}
        editUser={editingUser}
        isSubmitting={isSubmitting}
      />

      {/* Custom Delete Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => !isDeleting && setUserToDelete(null)}
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
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-semibold"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating dynamic status toast message queue */}
    </>
  );
}
