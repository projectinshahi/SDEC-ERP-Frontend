'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { BarChart3, Users, CheckSquare, TrendingUp, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { fetchUserCount } from '@/lib/api/users';
import { fetchActiveTaskCount } from '@/lib/api/tasks';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { fetchActivityFeed, clearActivityFeed, ActivityLog } from '@/lib/api/activity';
import { classNames } from '@/lib/utils';

interface ToastMsg { id: string; message: string; type: 'success' | 'error'; }

/**
 * Dashboard page - main overview of the system
 */
export default function DashboardPage() {
  // Stat Card 1: Total Users
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  // Stat Card 2: Active Tasks
  const [activeTasks, setActiveTasks] = useState<number>(0);
  const [isTasksLoading, setIsTasksLoading] = useState<boolean>(true);
  const [isTasksError, setIsTasksError] = useState<boolean>(false);

  // Activity Feed States
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(true);
  const [isActivitiesError, setIsActivitiesError] = useState<boolean>(false);
  const [isActivitiesClearing, setIsActivitiesClearing] = useState<boolean>(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const showToast = (message: string, type: ToastMsg['type']) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  // Fetch Total Users Count
  const getUserCountData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const data = await fetchUserCount();
      setTotalUsers(data.totalUsers);
    } catch (error) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Active Tasks Count
  const getActiveTaskCountData = async () => {
    try {
      setIsTasksLoading(true);
      setIsTasksError(false);
      const data = await fetchActiveTaskCount();
      setActiveTasks(data.activeTasks);
    } catch (error) {
      setIsTasksError(true);
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Fetch Recent Activities
  const getActivitiesData = async () => {
    try {
      setIsActivitiesLoading(true);
      setIsActivitiesError(false);
      
      const realActivities = await fetchActivityFeed();
      setActivities(realActivities);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
      setIsActivitiesError(true);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  // Clear Recent Activities
  const handleClearActivities = async () => {
    try {
      setIsActivitiesClearing(true);
      await clearActivityFeed();
      setActivities([]);
      showToast('Activity feed cleared', 'success');
    } catch (error) {
      console.error('Failed to clear activity feed:', error);
      showToast('Failed to clear activity feed', 'error');
    } finally {
      setIsActivitiesClearing(false);
    }
  };

  useEffect(() => {
    let active = true;
    
    if (active) {
      getUserCountData();
      getActiveTaskCountData();
      getActivitiesData();
    }
    
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="text-gray-650 dark:text-gray-400 mt-2">Welcome back! Here's an overview of your system.</p>
      </section>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={totalUsers}
          change="+12%"
          icon={Users}
          variant="info"
          isLoading={isLoading}
          isError={isError}
          onRetry={getUserCountData}
        />
        <StatCard
          label="Active Tasks"
          value={activeTasks}
          change="+5%"
          icon={CheckSquare}
          variant="success"
          isLoading={isTasksLoading}
          isError={isTasksError}
          onRetry={getActiveTaskCountData}
        />
        <StatCard
          label="System Load"
          value="45%"
          change="-2%"
          icon={TrendingUp}
          variant="warning"
          isLoading={false}
          isError={false}
        />
        <StatCard
          label="Performance"
          value="98.5%"
          change="+2%"
          icon={BarChart3}
          variant="danger"
          isLoading={false}
          isError={false}
        />
      </div>

      {/* Recent Activity & Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed
            activities={activities}
            isLoading={isActivitiesLoading}
            isError={isActivitiesError}
            onRetry={getActivitiesData}
            onClear={handleClearActivities}
            isClearing={isActivitiesClearing}
          />
        </div>

        {/* Quick Links Panel */}
        <div>
          <Card className="h-full border border-gray-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <CardHeader className="border-b border-gray-100 dark:border-slate-800/80 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Quick Access</h2>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-3.5">
                <a
                  href="/dashboard/user-management"
                  className="block p-3.5 rounded-xl bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/35 transition-all text-blue-600 dark:text-blue-400 font-semibold text-sm"
                >
                  → User Management
                </a>
                <a
                  href="/dashboard/tasks"
                  className="block p-3.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35 transition-all text-emerald-600 dark:text-emerald-400 font-semibold text-sm"
                >
                  → View Tasks
                </a>
                <a
                  href="/dashboard/user-management/roles"
                  className="block p-3.5 rounded-xl bg-purple-50/50 hover:bg-purple-100/50 dark:bg-purple-950/20 dark:hover:bg-purple-950/35 transition-all text-purple-600 dark:text-purple-400 font-semibold text-sm"
                >
                  → Manage Roles
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} role="alert"
            className={classNames(
              'pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border bg-white dark:bg-gray-800',
              t.type === 'success' ? 'border-green-100 dark:border-green-900/30' : 'border-red-100 dark:border-red-900/30'
            )}>
            <div className="flex-shrink-0">
              {t.type === 'success'
                ? <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500"><CheckCircle2 size={15} /></div>
                : <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500"><AlertCircle size={15} /></div>}
            </div>
            <div className={classNames('flex-1 text-xs font-semibold',
              t.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
            )}>{t.message}</div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}