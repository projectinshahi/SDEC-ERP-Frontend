'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

/**
 * Navbar component with user menu
 */
export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Left: Menu button (mobile) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          aria-label="Toggle menu"
        >
          <Menu size={20} className="text-gray-900" />
        </button>

        {/* Center: App Title */}
        <Link href="/dashboard" className="text-lg font-bold text-gray-900 hidden md:block">
          ERP System
        </Link>

        {/* Right: User Info and Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
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
