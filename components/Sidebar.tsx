'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const iconMap = {
  LayoutDashboard,
  Users,
  CheckSquare,
} as const;

interface SidebarItem {
  label: string;
  href: string;
  icon: keyof typeof iconMap;
}

interface SidebarProps {
  items: SidebarItem[];
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Sidebar component with collapsible desktop menu and responsive mobile drawer
 */
export const Sidebar = ({ items, isOpen, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // Desktop collapse state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
    // Set mounted to true in a separate macro-task/frame to ensure the initial width 
    // is set immediately WITHOUT triggering the sliding transition animation.
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 border border-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} className="text-zinc-800" /> : <Menu size={24} className="text-zinc-800" />}
      </button>

      {/* Overlay for mobile drawer */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar aside panel */}
      <aside
        className={classNames(
          'fixed md:relative top-0 left-0 h-screen bg-zinc-950 text-zinc-100 z-40 flex flex-col border-r border-zinc-900/60',
          mounted ? 'transition-all duration-300 ease-in-out' : '', // Enable transitions only AFTER initial mount is complete
          isCollapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'w-64' // Always w-64 on mobile or when expanding/collapsing
        )}
      >
        {/* Header / Brand Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-zinc-900/60 h-20 flex-shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <LayoutDashboard size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                SDEC ERP
              </h1>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform duration-200 cursor-pointer">
                SD
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="md:hidden p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 py-6 overflow-y-auto space-y-1.5 px-3">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const active = isActive(item.href);

            return (
              <div key={item.label} className="relative group">
                <Link
                  href={item.href}
                  className={classNames(
                    'flex items-center rounded-xl py-3 relative',
                    mounted ? 'transition-all duration-200 ease-out' : '', // Enable link transition only after mounting
                    isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'gap-3 px-4 mx-2',
                    active
                      ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-indigo-500/10 font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100'
                  )}
                  onClick={() => {
                    // Close sidebar on mobile when a link is clicked
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                >
                  {/* Glowing neon active indicator on the left */}
                  {active && (
                    <span className={classNames(
                      'absolute rounded-r bg-blue-400 shadow-[0_0_8px_#60a5fa]',
                      isCollapsed ? 'left-[-4px] top-1/4 h-1/2 w-1' : 'left-0 top-1/4 h-1/2 w-1.5'
                    )} />
                  )}
                  
                  <Icon
                    size={20}
                    className={classNames(
                      'transition-transform duration-200 group-hover:scale-105 flex-shrink-0',
                      active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                    )}
                  />
                  
                  {!isCollapsed && (
                    <span className="text-sm tracking-wide">{item.label}</span>
                  )}
                </Link>

                {/* Sleek Tooltip shown in Collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Area with persistent profile and desktop toggle */}
        <div className="border-t border-zinc-900/80 p-3 space-y-3 flex-shrink-0 bg-zinc-950/40">
          {/* Collapse/Expand Button for Desktop */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 transition-colors duration-200 cursor-pointer w-[calc(100%-16px)]"
          >
            {isCollapsed ? (
              <ChevronRight size={20} className="mx-auto flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft size={20} className="flex-shrink-0" />
                <span className="font-medium text-sm tracking-wide">Collapse Menu</span>
              </>
            )}
          </button>

          {/* User Profile Card */}
          {user && (
            <div className={classNames(
              'group relative flex items-center rounded-xl bg-zinc-900/40 border border-zinc-900 p-2.5',
              mounted ? 'transition-all duration-200' : '', // Enable transition only after mounting
              isCollapsed ? 'justify-center mx-auto' : 'justify-between'
            )}>
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with Status indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-indigo-500/10">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-950 shadow-sm" />
                </div>

                {!isCollapsed && (
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 font-medium truncate capitalize">{user.role}</p>
                  </div>
                )}
              </div>

              {!isCollapsed ? (
                <button
                  onClick={logout}
                  className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-500 rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              ) : (
                /* Avatar Tooltip for collapsed mode with quick info */
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap text-left">
                  <p className="font-semibold text-zinc-200">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 capitalize font-medium">{user.role}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
