'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { BarChart3, Users, CheckSquare, TrendingUp, CheckCircle2, AlertCircle, X, Bug, FolderDot } from 'lucide-react';
import { fetchProjectDashboardStats, fetchProjectActivities } from '@/lib/api/projects';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ActivityLog } from '@/lib/api/activity';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { useProject } from '@/lib/context/ProjectContext';

/**
 * Dashboard page - main overview of the system
 */
export default function DashboardPage() {
  const { toast } = useToast();
  const { activeProject } = useProject();

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    openBugs: 0,
    teamMembers: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [isStatsError, setIsStatsError] = useState<boolean>(false);

  // Activity Feed States
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(true);
  const [isActivitiesError, setIsActivitiesError] = useState<boolean>(false);

  // Fetch Dashboard Stats
  const getStatsData = async () => {
    if (!activeProject) return;
    try {
      setIsStatsLoading(true);
      setIsStatsError(false);
      const data = await fetchProjectDashboardStats(activeProject.id);
      setStats({
        totalTasks: data.totalTasks || 0,
        activeTasks: data.activeTasks || 0,
        completedTasks: data.completedTasks || 0,
        openBugs: data.openBugs || 0,
        teamMembers: data.teamMembers || 0
      });
    } catch (error) {
      setIsStatsError(true);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Fetch Recent Activities
  const getActivitiesData = async () => {
    if (!activeProject) return;
    try {
      setIsActivitiesLoading(true);
      setIsActivitiesError(false);
      const realActivities = await fetchProjectActivities(activeProject.id);
      setActivities(realActivities);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
      setIsActivitiesError(true);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    
    if (activeProject && active) {
      getStatsData();
      getActivitiesData();
    }
    
    return () => {
      active = false;
    };
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FolderDot size={48} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">No Active Project</h2>
        <p className="text-gray-500 mt-2">Please select a project from the top navigation bar to view the dashboard.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard - {activeProject.name}</h1>
        <p className="text-gray-650 dark:text-gray-400 mt-2">Here's an overview of your selected project.</p>
      </section>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Tasks"
          value={stats.totalTasks}
          change=""
          icon={BarChart3}
          variant="info"
          isLoading={isStatsLoading}
          isError={isStatsError}
          onRetry={getStatsData}
        />
        <StatCard
          label="Active Tasks"
          value={stats.activeTasks}
          change=""
          icon={CheckSquare}
          variant="success"
          isLoading={isStatsLoading}
          isError={isStatsError}
          onRetry={getStatsData}
        />
        <StatCard
          label="Completed Tasks"
          value={stats.completedTasks}
          change=""
          icon={CheckCircle2}
          variant="warning"
          isLoading={isStatsLoading}
          isError={isStatsError}
          onRetry={getStatsData}
        />
        <StatCard
          label="Open Bugs"
          value={stats.openBugs}
          change=""
          icon={Bug}
          variant="danger"
          isLoading={isStatsLoading}
          isError={isStatsError}
          onRetry={getStatsData}
        />
        <StatCard
          label="Team Members"
          value={stats.teamMembers}
          change=""
          icon={Users}
          variant="primary"
          isLoading={isStatsLoading}
          isError={isStatsError}
          onRetry={getStatsData}
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

    </>
  );
}