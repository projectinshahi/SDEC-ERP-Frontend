'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { UserTable } from '@/components/user-management/UserTable';
import { fetchUsers, UserDbResponse } from '@/lib/api/users';
import type { User } from '@/lib/types/user-management';
import { AlertCircle, RotateCw, Users, ShieldAlert } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      // Maps backend SQL schema (role, capitalized Active/Inactive status) to local User state structure
      const formatted = data.map((u: UserDbResponse) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        roles: u.role ? u.role.split(',').map((r: string) => r.trim()) : [],
        status: String(u.status).toLowerCase() as 'active' | 'inactive',
        createdAt: new Date().toISOString().split('T')[0],
      }));
      setUsers(formatted);
    } catch (err: any) {
      console.error('Error fetching users from Neon DB:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumb items={[{ label: 'User Management' }, { label: 'Database Users' }]} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600/5 to-transparent p-5 rounded-2xl border border-blue-500/10">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Users className="text-blue-600" size={24} />
              User Directory Matrix
            </h1>
            <p className="text-sm text-gray-500 font-semibold mt-1">
              Synchronized live in real-time with your Neon PostgreSQL records.
            </p>
          </div>
          {!isLoading && !error && (
            <Button
              variant="secondary"
              size="sm"
              onClick={loadUsers}
              className="flex items-center gap-2 border border-slate-200 shadow-sm"
            >
              <RotateCw size={14} />
              Sync DB
            </Button>
          )}
        </div>

        {/* Dynamic Table State Renderings */}
        {isLoading ? (
          <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Skeleton Table Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 grid grid-cols-5 font-bold text-xs text-slate-400 uppercase tracking-wider">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            
            {/* Skeleton Rows (5 rows with pulse animation) */}
            <div className="divide-y divide-slate-100 bg-white">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4.5 grid grid-cols-5 items-center animate-pulse">
                  {/* Name Skeleton */}
                  <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
                  {/* Email Skeleton */}
                  <div className="h-4 bg-slate-200 rounded-md w-5/6"></div>
                  {/* Role Badge Skeleton */}
                  <div className="h-5 bg-slate-200 rounded-md w-1/3"></div>
                  {/* Status Badge Skeleton */}
                  <div className="h-5 bg-slate-200 rounded-full w-2/5"></div>
                  {/* Actions Skeleton */}
                  <div className="flex justify-end gap-2">
                    <div className="h-6 w-6 bg-slate-200 rounded-md"></div>
                    <div className="h-6 w-6 bg-slate-200 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card variant="outlined" className="p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto bg-rose-50/10 border-rose-100 rounded-2xl shadow-md">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-4 shadow-sm animate-bounce">
              <ShieldAlert size={24} />
            </div>
            <h2 className="text-gray-800 font-extrabold text-base tracking-tight">{error}</h2>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed max-w-sm">
              Please verify your SDEC-ERP-backend is active on port 3001, and that Neon PostgreSQL is connected successfully.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={loadUsers}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <RotateCw size={16} />
              Retry Connection
            </Button>
          </Card>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-gray-700 font-extrabold text-sm">No users found</h3>
            <p className="text-gray-400 text-xs mt-1 text-center max-w-xs leading-normal">
              Your PostgreSQL database is connected, but the users table contains 0 records.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <UserTable
              users={users}
              onEdit={(user) => alert(`Modifying profile for: ${user.name}`)}
              onDelete={(id) => alert(`Deleting record ID: ${id}`)}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
