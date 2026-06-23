'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/lib/hooks/useAuth';
import { ShieldCheck, BarChart4, Users2, Activity } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Every authenticated user — SuperAdmin included — lands on the Modules
  // selection page (the central entry point). SuperAdmin opens the Master
  // Dashboard from there via the SuperAdmin card.
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace('/modules');
    }
  }, [isAuthenticated, isLoading, router, user]);

  // Render a full-page loading loader if auth state is initializing and we're redirecting
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-0 md:p-6 lg:p-8">
      {/* Container holding the modern split screen layout */}
      <div className="w-full max-w-[1200px] min-h-[680px] bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Branding, Illustrations and Highlights (Visible on lg and above) */}
        <section className="hidden lg:flex lg:col-span-5 bg-gradient-to-tr from-indigo-900 via-indigo-850 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden text-white">
          {/* Abstract Grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          {/* Neon Orb glowing design element */}
          <div className="absolute top-[-20%] right-[-20%] w-[350px] h-[350px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-violet-600/25 blur-[90px] rounded-full pointer-events-none" />

          {/* Logo & Branding Top Header */}
          <header className="relative flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              SDEC<span className="text-indigo-300 font-medium">ERP</span>
            </span>
          </header>

          {/* Core Dashboard Values and Bullets */}
          <div className="relative my-auto space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
                Empower Your <br />Enterprise Analytics.
              </h2>
              <p className="text-sm text-indigo-100 font-normal leading-relaxed max-w-sm">
                A unified, scalable system for managing teams, tasks, and real-time operations inside a single premium portal.
              </p>
            </div>

            {/* Dashboard bullets */}
            <div className="space-y-4">
              {[
                { icon: BarChart4, label: 'Real-time Neon Database Syncing' },
                { icon: Users2, label: 'Advanced User & Roles Privilege' },
                { icon: Activity, label: 'High-speed Tasks Kanban Board' },
              ].map((bullet, idx) => {
                const BulletIcon = bullet.icon;
                return (
                  <div key={idx} className="flex items-center gap-3.5 group">
                    <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/10 group-hover:scale-105 transition-all">
                      <BulletIcon className="w-4.5 h-4.5 text-indigo-200" />
                    </div>
                    <span className="text-sm font-medium text-indigo-100">{bullet.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner bottom details */}
          <footer className="relative flex justify-between text-xs text-indigo-200/80 font-normal">
            <span>© 2026 SDEC Inc.</span>
            <span>All rights reserved.</span>
          </footer>
        </section>

        {/* Right Side: Centered login card & form panel */}
        <section className="lg:col-span-7 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-20 bg-white dark:bg-slate-900">
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* Form Top Title */}
            <header className="space-y-3">
              {/* Logo (Stacked view on mobile) */}
              <div className="flex lg:hidden items-center gap-2 mb-4 justify-center">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  SDEC<span className="text-indigo-600 font-medium">ERP</span>
                </span>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center lg:text-left">
                Welcome Back
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center lg:text-left">
                Enter your credentials to manage your business metrics.
              </p>
            </header>

            {/* Render Login form card component */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl">
              <LoginForm />
            </div>

            {/* Mobile Footer branding details */}
            <footer className="lg:hidden text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
              <p>© 2026 SDEC Inc. All rights reserved.</p>
            </footer>
          </div>
        </section>

      </div>
    </main>
  );
}
