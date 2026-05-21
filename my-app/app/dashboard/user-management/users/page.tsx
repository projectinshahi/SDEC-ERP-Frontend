import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users | ERP System',
  description: 'Manage system users',
};

import { DashboardLayout } from '@/components/Layout';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ROUTES } from '@/lib/constants';
import { Plus, Edit, Trash2 } from 'lucide-react';

/**
 * Users page - display and manage users
 */
export default function UsersPage() {
  // Dummy user data
  const users = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Admin',
      status: 'active',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'Manager',
      status: 'active',
      createdAt: '2024-02-20',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'User',
      status: 'inactive',
      createdAt: '2024-03-10',
    },
    {
      id: '4',
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      role: 'Manager',
      status: 'active',
      createdAt: '2024-03-25',
    },
    {
      id: '5',
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      role: 'User',
      status: 'active',
      createdAt: '2024-04-05',
    },
  ];

  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'success' : 'warning';
  };

  return (
    <DashboardLayout>
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
          <h1 className="text-3xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-600 mt-2">Manage system users and their access</p>
        </div>
        <Button variant="primary" size="lg">
          <Plus size={20} />
          Add User
        </Button>
      </section>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">All Users</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800">{user.name}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={getStatusVariant(user.status)}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{user.createdAt}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                        <Edit size={18} className="text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
        <CardFooter>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Showing 1 to {users.length} of {users.length} users</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Previous
              </Button>
              <Button variant="secondary" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
