'use client';

import { ReactNode, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SIDEBAR_MENU } from '@/lib/constants';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout component that wraps all dashboard pages
 * Includes navbar, sidebar, and error boundary
 */
export const DashboardLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = SIDEBAR_MENU.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon as any,
  }));

  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <Sidebar
            items={menuItems}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navbar */}
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
};
