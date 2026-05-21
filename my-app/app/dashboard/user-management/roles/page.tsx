import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roles | ERP System',
  description: 'Manage system roles',
};

import { DashboardLayout } from '@/components/Layout';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ROUTES } from '@/lib/constants';
import { Plus, Edit, Trash2, Lock } from 'lucide-react';

/**
 * Roles page - display and manage roles
 */
export default function RolesPage() {
  // Dummy role data
  const roles = [
    {
      id: '1',
      name: 'Admin',
      description: 'Full system access with all permissions',
      permissions: 12,
      userCount: 2,
      createdAt: '2024-01-10',
    },
    {
      id: '2',
      name: 'Manager',
      description: 'Can manage users and view reports',
      permissions: 8,
      userCount: 5,
      createdAt: '2024-01-15',
    },
    {
      id: '3',
      name: 'User',
      description: 'Basic access to assigned tasks and data',
      permissions: 3,
      userCount: 15,
      createdAt: '2024-02-01',
    },
    {
      id: '4',
      name: 'Viewer',
      description: 'Read-only access to reports and dashboards',
      permissions: 2,
      userCount: 8,
      createdAt: '2024-02-15',
    },
  ];

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'User Management', href: ROUTES.USER_MANAGEMENT },
            { label: 'Roles' },
          ]}
        />
      </div>

      {/* Page Header */}
      <section className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Roles</h1>
          <p className="text-gray-600 mt-2">Create and manage system roles and permissions</p>
        </div>
        <Button variant="primary" size="lg">
          <Plus size={20} />
          Create Role
        </Button>
      </section>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <Card key={role.id} variant="outlined">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{role.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                </div>
                <Lock size={20} className="text-gray-400" />
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Permissions</p>
                  <p className="text-2xl font-bold text-gray-800">{role.permissions}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Users</p>
                  <p className="text-2xl font-bold text-gray-800">{role.userCount}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Created {role.createdAt}</p>
            </CardBody>
            <CardFooter>
              <div className="flex gap-2 w-full">
                <Button variant="secondary" fullWidth size="sm">
                  <Edit size={16} />
                  Edit
                </Button>
                <Button variant="danger" fullWidth size="sm">
                  <Trash2 size={16} />
                  Delete
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Permission Guide */}
      <div className="mt-12">
        <Card variant="outlined">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">Permission Guide</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Common Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'View Dashboard',
                    'Manage Users',
                    'Edit Settings',
                    'View Reports',
                    'Export Data',
                    'Delete Records',
                  ].map((permission) => (
                    <div key={permission} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-gray-700">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> You can create custom roles with specific permission combinations tailored to your organization's needs.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
