'use client';

import React from 'react';
import {
  ClipboardList,
  UserCheck,
  Award,
  CheckCircle2,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Trash2
} from 'lucide-react';

import { KPIStatCard } from '@/components/hr/KPIStatCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Alert } from '@/components/Alert';
import { usePerformance } from '@/lib/hr/usePerformance';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AppraisalModal } from '@/components/hr/performance/AppraisalModal';
import { CycleModal } from '@/components/hr/performance/CycleModal';
import { ReviewDetailDrawer } from '@/components/hr/performance/ReviewDetailDrawer';

export default function PerformancePage() {
  const { permissions, roleName, isSuperAdmin } = usePermissions();
  const isHR = isSuperAdmin || roleName === 'HR Admin' || permissions.includes('hr.performance.create');

  const {
    cycles,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    filterCycle,
    setFilterCycle,
    filterStatus,
    setFilterStatus,
    filteredAppraisals,

    // Modal state
    isCycleModalOpen,
    setIsCycleModalOpen,
    isAppraisalModalOpen,
    setIsAppraisalModalOpen,
    isReviewDrawerOpen,
    detailedAppraisal,
    isLoadingDetails,
    openReviewDrawer,
    closeReviewDrawer,

    // Mutators
    handleCreateCycle,
    handleAssignAppraisal,
    handleDeleteAppraisal,
    handleSubmitSelfReview,
    handleSubmitManagerReview,
    handleApproveAppraisal,
    handleRejectAppraisal,
    handleCreateGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    employees,
  } = usePerformance();

  // Status mapping to Badge variants
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'self_review':
        return <Badge variant="warning">Self Review</Badge>;
      case 'manager_review':
        return <Badge variant="info">Manager Review</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Approved':
        return <Badge variant="success">Approved</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header Banner */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300 mb-3">
            Human Resources Management
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Performance Reviews & Appraisals
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Initiate, track, evaluate, and approve employee appraisal cycles and goals targets.
          </p>
        </div>

        {/* Action Controls */}
        {isHR && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCycleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-850 shadow-sm transition"
            >
              <ClipboardList size={16} />
              <span>Create Cycle</span>
            </button>
            <button
              onClick={() => setIsAppraisalModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-sm font-semibold text-white shadow-sm transition"
            >
              <Plus size={16} />
              <span>Assign Appraisal</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStatCard
          label="Total Active Reviews"
          value={stats.active}
          subtitle="Awaiting assessments"
          icon={ClipboardList}
          variant="blue"
        />
        <KPIStatCard
          label="Pending Self Reviews"
          value={stats.self_pending}
          subtitle="Employee actions required"
          icon={UserCheck}
          variant="amber"
        />
        <KPIStatCard
          label="Pending Manager Reviews"
          value={stats.manager_pending}
          subtitle="Manager evaluations pending"
          icon={Award}
          variant="indigo"
        />
        <KPIStatCard
          label="Completed Appraisals"
          value={stats.completed}
          subtitle="Evaluations completed / signed off"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {error && (
        <Alert variant="error" title="Performance Module Error" onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Filters workspace bar */}
      <Card className="p-4 bg-gray-50/50 dark:bg-gray-800/10 border-gray-100 dark:border-gray-850/40 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, code, dept, reviewer..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Search size={14} />
            </div>
          </div>

          {/* Selection filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <SlidersHorizontal size={12} />
              <span>Filters</span>
            </div>

            {/* Cycles Filter */}
            <select
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Cycles</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="self_review">Self Review</option>
              <option value="manager_review">Manager Review</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main appraisal listings table */}
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-850 shadow-sm bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-400 font-semibold">Loading appraisal records...</span>
            </div>
          ) : filteredAppraisals.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800/30 flex items-center justify-center text-gray-400">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">No Appraisals Found</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm leading-relaxed">
                We couldn't find any appraisal cycles matching the current search parameters or assignments list.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-850">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Department & Role
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Review Cycle
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Evaluator
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">
                    Overall Rating
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {filteredAppraisals.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-xs text-gray-900 dark:text-white leading-none">
                        {app.employee_name}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                        {app.employee_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                      <div>{app.designation}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{app.department}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                      {app.cycle_title}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                      {app.manager_name ? (
                        <div>
                          <div className="font-medium text-xs leading-none">{app.manager_name}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-bold">{app.manager_code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold">
                      {app.status === 'completed' || app.overall_rating != null ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="inline-flex items-center gap-1 text-xs font-black text-amber-500 dark:text-amber-400 tabular-nums">
                            <TrendingUp size={12} />
                            {app.overall_rating ?? app.final_rating}
                          </div>
                          {app.overall_rating != null && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-extrabold uppercase mt-0.5 tracking-wider block">
                              {app.overall_rating >= 4.5
                                ? 'Outstanding'
                                : app.overall_rating >= 4.0
                                ? 'Excellent'
                                : app.overall_rating >= 3.0
                                ? 'Good'
                                : app.overall_rating >= 2.0
                                ? 'Needs Imp.'
                                : 'Poor'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isHR && (
                          <button
                            onClick={() => handleDeleteAppraisal(app.id)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                            title="Delete Assignment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => openReviewDrawer(app.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            app.status === 'manager_review'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                              : 'border border-gray-200 dark:border-gray-850 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span>
                            {app.status === 'manager_review'
                              ? 'Manager Review'
                              : (app.status === 'completed' || (app.status as string) === 'Approved')
                              ? 'View Report'
                              : 'Evaluate'}
                          </span>
                          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Cycle Modal dialog */}
      <CycleModal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        onSubmit={handleCreateCycle}
      />

      {/* Appraisal modal dialog */}
      <AppraisalModal
        isOpen={isAppraisalModalOpen}
        onClose={() => setIsAppraisalModalOpen(false)}
        onSubmit={handleAssignAppraisal}
        employees={employees}
        cycles={cycles}
      />

      {/* Evaluation details sliding drawer */}
      <ReviewDetailDrawer
        isOpen={isReviewDrawerOpen}
        onClose={closeReviewDrawer}
        appraisal={detailedAppraisal}
        isLoading={isLoadingDetails}
        onSubmitSelfReview={handleSubmitSelfReview}
        onSubmitManagerReview={handleSubmitManagerReview}
        onApproveAppraisal={handleApproveAppraisal}
        onRejectAppraisal={handleRejectAppraisal}
        onCreateGoal={handleCreateGoal}
        onUpdateGoal={handleUpdateGoal}
        onDeleteGoal={handleDeleteGoal}
        employees={employees}
      />
    </div>
  );
}
