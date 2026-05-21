import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | ERP System',
  description: 'Main dashboard overview',
};

import { DashboardLayout } from '@/components/Layout';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { BarChart3, Users, CheckSquare, TrendingUp } from 'lucide-react';

/**
 * Dashboard page - main overview of the system
 */
export default function DashboardPage() {
  // Dummy data for dashboard statistics
  const stats = [
    {
      label: 'Total Users',
      value: '1,234',
      change: '+12%',
      icon: Users,
      variant: 'info',
    },
    {
      label: 'Active Tasks',
      value: '567',
      change: '+5%',
      icon: CheckSquare,
      variant: 'success',
    },
    {
      label: 'Revenue',
      value: '$45,678',
      change: '+23%',
      icon: TrendingUp,
      variant: 'warning',
    },
    {
      label: 'Performance',
      value: '98.5%',
      change: '+2%',
      icon: BarChart3,
      variant: 'danger',
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your system.</p>
      </section>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} variant="outlined">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-2">
                      <span className="inline-block">{stat.change}</span> from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon size={24} className="text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">User action #{i}</p>
                      <p className="text-sm text-gray-500">2 hours ago</p>
                    </div>
                    <Badge variant="info">Completed</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-800">Quick Access</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <a
                  href="/dashboard/user-management"
                  className="block p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600 font-medium"
                >
                  → User Management
                </a>
                <a
                  href="/dashboard/tasks"
                  className="block p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-600 font-medium"
                >
                  → View Tasks
                </a>
                <a
                  href="/dashboard/user-management/roles"
                  className="block p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-purple-600 font-medium"
                >
                  → Manage Roles
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
