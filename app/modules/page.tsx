'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Code, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

export default function ModulesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Route protection
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
    // If SuperAdmin somehow lands here, redirect them to master-dashboard
    if (!isLoading && isAuthenticated && user && (user.roleName === 'SuperAdmin' || user.role === 'SuperAdmin')) {
      router.replace('/master-dashboard');
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome, {user?.name}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Please select a module to continue to your workspace.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {/* Development Module Card */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 text-left shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-900/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                <Code className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Development
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                Access projects, boards, bugs, and development team management.
              </p>
            </div>
            
            {/* Arrow Indicator */}
            <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-600">
              →
            </div>
          </button>

          {/* Placeholder for future modules (hidden per requirements) */}
          {/* Sales, HR, Finance will be added here in the future phase */}
        </div>

      </div>
    </main>
  );
}
