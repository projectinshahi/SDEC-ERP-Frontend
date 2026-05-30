'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { CreateRoleModal } from '@/components/user-management/CreateRoleModal';
import { Modal } from '@/components/Modal';
import { ROUTES } from '@/lib/constants';
import {
  Plus,
  Edit,
  Trash2,
  Lock,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { fetchRolesApi, deleteRoleApi } from '@/lib/api/roles';
import { classNames } from '@/lib/utils';

interface RoleData {
  id: string | number;
  name: string;
  description: string;
  permissions: string[] | string | unknown;
  userCount?: number;
  createdAt: string;
}

export function RoleManagementClient() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleData | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const { toast } = useToast();

  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRolesApi();
      setRoles(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect to backend service.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await deleteRoleApi(String(roleToDelete.id));
      toast('Role deleted successfully', 'success');
      setRoleToDelete(null);
      loadRoles();
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to delete role');
      toast(
        errMsg === 'Cannot delete role. It is assigned to active users.'
          ? 'Cannot delete role. This role is assigned to active users.'
          : errMsg,
        'error'
      );
    } finally {
      setIsDeletingRole(false);
    }
  };

  const getPermissionCount = (perms: unknown): number => {
    if (Array.isArray(perms)) return perms.length;
    if (typeof perms === 'string') {
      try {
        const parsed = JSON.parse(perms);
        if (Array.isArray(parsed)) return parsed.length;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <PermissionPageGuard module="role">
      {/* Breadcrumb */}
      <div className="mb-6 animate-fade-in">
        <Breadcrumb items={[{ label: 'Role Management' }]} />
      </div>

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600" size={28} />
            Role Management
          </h1>
          <p className="text-gray-500 mt-1">
            Create, view, and configure security roles and permissions in the system.
          </p>
        </div>

        {/* Only show "Create Role" button if user has role.create permission */}
        <PermissionGuard require="role.create">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setEditingRole(null);
              setIsModalOpen(true);
            }}
            className="shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus size={20} className="mr-1" />
            Create Role
          </Button>
        </PermissionGuard>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-start animate-shake">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-rose-900">Failed to load roles</h4>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
            <button
              onClick={loadRoles}
              className="text-xs font-bold text-rose-900 underline hover:text-rose-950 mt-2 block"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} variant="outlined" className="animate-pulse border-gray-100">
              <CardHeader className="pb-2 border-b-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-2/3">
                    <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
                    <div className="h-4 bg-gray-100 rounded-lg w-5/6" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100" />
                </div>
              </CardHeader>
              <CardBody className="py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    <div className="h-7 bg-gray-200 rounded-lg w-1/3" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    <div className="h-7 bg-gray-200 rounded-lg w-1/3" />
                  </div>
                </div>
              </CardBody>
              <CardFooter className="pt-2">
                <div className="flex gap-3 w-full">
                  <div className="h-9 bg-gray-150 rounded-lg w-1/2" />
                  <div className="h-9 bg-gray-150 rounded-lg w-1/2" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        /* Empty State */
        <Card
          variant="outlined"
          className="p-12 text-center max-w-xl mx-auto border-dashed border-2 border-gray-200 rounded-2xl animate-fade-in shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Roles Configured</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            You haven't added any access control roles yet. Get started by creating your first system role.
          </p>
          <PermissionGuard require="role.create">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="mt-6"
            >
              <Plus size={16} className="mr-1.5" />
              Create Your First Role
            </Button>
          </PermissionGuard>
        </Card>
      ) : (
        /* Roles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <div
              key={role.id}
              className="flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card
                variant="outlined"
                className="group hover:border-blue-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 rounded-2xl border-gray-100 flex flex-col justify-between h-full w-full"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5">
                        {role.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {role.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all duration-300">
                      <Lock size={18} />
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="py-2">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/50 rounded-xl mb-3 border border-gray-50">
                    <div>
                      <p className="text-xxs font-bold text-gray-400 uppercase tracking-wider">
                        Permissions
                      </p>
                      <p className="text-2xl font-black text-gray-800 mt-0.5">
                        {getPermissionCount(role.permissions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xxs font-bold text-gray-400 uppercase tracking-wider">
                        Active Users
                      </p>
                      <p className="text-2xl font-black text-gray-800 mt-0.5">
                        {role.userCount || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xxs font-semibold text-gray-400 px-1">
                    <span>SYSTEM ROLE</span>
                    <span>Created {formatDate(role.createdAt)}</span>
                  </div>
                </CardBody>

                <CardFooter className="pt-4 border-t border-gray-50">
                  <div className="flex gap-2.5 w-full">
                    {/* Edit button — requires role.update */}
                    <PermissionGuard require="role.update">
                      <Button
                        variant="secondary"
                        fullWidth
                        size="sm"
                        className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                        onClick={() => {
                          setEditingRole(role);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit size={14} className="mr-1.5 text-gray-400" />
                        Edit Role
                      </Button>
                    </PermissionGuard>

                    {/* Delete button — requires role.delete */}
                    <PermissionGuard require="role.delete">
                      <Button
                        variant="danger"
                        fullWidth
                        size="sm"
                        className="bg-red-50 hover:bg-red-100 border-transparent text-red-600 hover:text-red-700"
                        onClick={() => setRoleToDelete(role)}
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        Delete
                      </Button>
                    </PermissionGuard>
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      <CreateRoleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRole(null);
        }}
        onSubmitSuccess={loadRoles}
        roleToEdit={editingRole}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!roleToDelete}
        onClose={() => !isDeletingRole && setRoleToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            Delete Security Role?
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete role{' '}
            <span className="font-semibold text-gray-800">"{roleToDelete?.name}"</span>? This
            action cannot be undone.
            {roleToDelete?.userCount ? (
              <span className="block mt-4 p-3 rounded-lg border border-red-100 bg-red-50/50 text-red-700 text-xs font-semibold text-left">
                ⚠️ This role is assigned to {roleToDelete.userCount} active user
                {roleToDelete.userCount > 1 ? 's' : ''}. You will not be able to delete it.
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
              onClick={handleConfirmDelete}
              isLoading={isDeletingRole}
              disabled={!!roleToDelete?.userCount}
            >
              {isDeletingRole ? 'Deleting...' : 'Delete Role'}
            </Button>
          </div>
        </div>
      </Modal>

    </PermissionPageGuard>
  );
}
