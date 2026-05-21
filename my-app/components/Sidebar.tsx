'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { classNames } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ChevronDown,
  Menu,
  X,
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
 * Sidebar component with collapsible menu
 */
export const Sidebar = ({ items, isOpen, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed md:relative top-0 left-0 h-screen w-64 bg-gray-900 text-white transition-transform duration-300 z-40 overflow-y-auto',
          !isOpen && '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">ERP Dashboard</h1>
          <button
            onClick={onToggle}
            className="md:hidden p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-6">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const active = isActive(item.href);

            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={classNames(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                    active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                  onClick={() => {
                    // Close sidebar on mobile when a link is clicked
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
