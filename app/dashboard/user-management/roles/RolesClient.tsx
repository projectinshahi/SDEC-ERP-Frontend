'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ROUTES } from '@/lib/constants';
import { Plus, Edit, Trash2, Lock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { fetchRolesApi } from '@/lib/api/roles';
import { CreateRoleModal } from '@/components/user-management/CreateRoleModal';

interface RoleData {
  id: string | number;
  name: string;
  description: string;
  permissions: string[] | string | any;
  userCount?: number;
  createdAt: string;
}

export function RolesClient() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);

  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRolesApi();
      setRoles(data);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to connect to backend service. Ensure DB and server are running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const getPermissionCount = (perms: any): number => {
    if (Array.isArray(perms)) {
      return perms.length;
    }
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
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 animate-fade-in">
        <Breadcrumb
          items={[
            { label: 'User Management', href: ROUTES.USER_MANAGEMENT },
            { label: 'Roles' },
          ]}
        />
      </div>

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="text-blue-600" size={28} />
            Roles & Permissions
          </h1>
          <p className="text-gray-500 mt-1">Create, view, and configure security roles and permissions in the system</p>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={() => setIsModalOpen(true)}
          className="shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus size={20} className="mr-1" />
          Create Role
        </Button>
      </section>

      {/* Error Alert Box */}
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

      {/* Loading Skeleton Grid */}
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
        <Card variant="outlined" className="p-12 text-center max-w-xl mx-auto border-dashed border-2 border-gray-200 rounded-2xl animate-fade-in shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Roles Configured</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            You haven't added any access control roles yet. Get started by creating your first system role.
          </p>
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => setIsModalOpen(true)}
            className="mt-6"
          >
            <Plus size={16} className="mr-1.5" />
            Create Your First Role
          </Button>
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
                      <p className="text-xxs font-bold text-gray-400 uppercase tracking-wider">Permissions</p>
                      <p className="text-2xl font-black text-gray-800 mt-0.5">{getPermissionCount(role.permissions)}</p>
                    </div>
                    <div>
                      <p className="text-xxs font-bold text-gray-400 uppercase tracking-wider">Active Users</p>
                      <p className="text-2xl font-black text-gray-800 mt-0.5">{role.userCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xxs font-semibold text-gray-400 px-1">
                    <span>SYSTEM ROLE</span>
                    <span>Created {formatDate(role.createdAt)}</span>
                  </div>
                </CardBody>
                <CardFooter className="pt-4 border-t border-gray-50">
                  <div className="flex gap-2.5 w-full">
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
                      <Edit size={14} className="mr-1.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      Edit Role
                    </Button>
                    <Button variant="danger" fullWidth size="sm" className="bg-red-50 hover:bg-red-100 border-transparent text-red-600 hover:text-red-700">
                      <Trash2 size={14} className="mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Permission Guide Section */}
      <div className="mt-12 animate-fade-in">
        <Card variant="outlined" className="bg-gradient-to-r from-gray-50 to-white border-gray-150 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              Permission Guide
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">Available Core Permissions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { name: 'Create User', group: 'User Management' },
                    { name: 'Edit User', group: 'User Management' },
                    { name: 'Delete User', group: 'User Management' },
                    { name: 'Create Task', group: 'Task Management' },
                    { name: 'Edit Task', group: 'Task Management' },
                    { name: 'Delete Task', group: 'Task Management' },
                  ].map((permission) => (
                    <div key={permission.name} className="flex items-center gap-3 p-2.5 bg-white border border-gray-100 rounded-xl shadow-xxs">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">{permission.name}</span>
                        <span className="text-xxs font-semibold text-gray-400">{permission.group}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-900 leading-relaxed font-semibold">
                  💡 <strong>Tip:</strong> System security roles define the access levels of users. After creating a role, you can immediately assign it to new or existing team members in the **Users** tab.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Interactive Creation Modal */}
      <CreateRoleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRole(null);
        }}
        onSubmitSuccess={loadRoles}
        roleToEdit={editingRole}
      />
    </>
  );
}
