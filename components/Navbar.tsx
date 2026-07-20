'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProject } from '@/lib/context/ProjectContext';
import { useTheme } from '@/lib/hooks/useTheme';
import { LogOut, Menu, FolderDot, ChevronDown, Search, HelpCircle, Sun, Moon } from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';

interface NavbarProps {
  onMenuClick?: () => void;
}

/**
 * Navbar component with user menu
 */
export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProjectId, isLoading } = useProject();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-20 bg-white bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
      <div className="px-4 md:px-6 py-3.5 flex items-center justify-between">
        {/* Left: Menu button (mobile) */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={20} className="text-gray-900 dark:text-gray-100" />
          </button>
        </div>

        {/* Center: Centered Search Bar */}
        {/* <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search everything..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-1.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div> */}

        {/* Right: User Info and Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5 ml-auto">
          {/* Theme toggle — light / dark */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Help Icon */}
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
            title="Help & Support"
            aria-label="Help & Support"
          >
            <HelpCircle size={20} />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Vertical Separator */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 hidden sm:block" />

          {user && (
            <div className="flex items-center gap-3 pl-1">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{user.name}</p>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{user.role}</p>
              </div>
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-indigo-500/10">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-950 shadow-sm" />
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-650 dark:text-gray-400 hover:text-rose-650 dark:hover:text-rose-400 transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};
