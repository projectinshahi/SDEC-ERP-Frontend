'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { SprintList } from '@/components/sprints/SprintList';
import { SprintBoard } from '@/components/sprints/SprintBoard';
import { SprintDashboard } from '@/components/sprints/SprintDashboard';
import { classNames } from '@/lib/utils';
import { Rocket, KanbanSquare, BarChart3 } from 'lucide-react';

type Tab = 'list' | 'board' | 'dashboard';

export function SprintClient() {
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const tabs = [
    { id: 'list', label: 'Sprint List', icon: Rocket },
    // { id: 'board', label: 'Sprint Board', icon: KanbanSquare },
    // { id: 'dashboard', label: 'Analytics', icon: BarChart3 },
  ] as const;

  return (
    <PermissionPageGuard module="sprints">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Sprint Tracking' }]} />
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sprint Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">Manage iterative development cycles, track progress, and analyze velocity.</p>
        </div>
        
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar border border-gray-200/60 shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                  isActive 
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' 
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 border border-transparent'
                )}
              >
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 animate-in fade-in duration-300">
        {activeTab === 'list' && <SprintList />}
        {activeTab === 'board' && <SprintBoard />}
        {activeTab === 'dashboard' && <SprintDashboard />}
      </div>
    </PermissionPageGuard>
  );
}
