'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, RefreshCw, Layers, CheckCircle, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { Column } from './Column';
import { CreateTaskModal, Task, TaskFormData } from './CreateTaskModal';
import { Card, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { DUMMY_USERS } from '@/lib/data/user-management-data';

// Initial realistic mock tasks mapping perfectly to ERP workflow
const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Migrate DB to PostgreSQL',
    description: 'Optimize queries and run migration script on production DB replicas.',
    priority: 'high',
    assignee: 'John Doe',
    status: 'todo',
    dueDate: '2026-06-05',
  },
  {
    id: 'task-2',
    title: 'Design UI for Inventory Page',
    description: 'Build Figma mockups and outline design system guidelines for the warehouse panel.',
    priority: 'medium',
    assignee: 'Jane Smith',
    status: 'in-progress',
    dueDate: '2026-06-10',
  },
  {
    id: 'task-3',
    title: 'Fix OAuth Callback Redirect',
    description: 'Resolve redirect URI issues on staging server for SSO authenticators.',
    priority: 'high',
    assignee: 'Alice Williams',
    status: 'review',
    dueDate: '2026-05-24',
  },
  {
    id: 'task-4',
    title: 'Integrate Stripe SDK',
    description: 'Implement secure credit card checkout flow and subscription webhooks.',
    priority: 'low',
    assignee: 'John Doe',
    status: 'in-progress',
    dueDate: '2026-06-15',
  },
  {
    id: 'task-5',
    title: 'Compile Q1 Finance Audits',
    description: 'Prepare tax declaration sheets and revenue summaries for stakeholders review.',
    priority: 'low',
    assignee: 'Charlie Brown',
    status: 'done',
    dueDate: '2026-05-15',
  },
  {
    id: 'task-6',
    title: 'Refactor Auth Middleware',
    description: 'Reduce API route execution latency and secure cookies JWT validation.',
    priority: 'medium',
    assignee: 'Bob Johnson',
    status: 'todo',
    dueDate: '2026-06-01',
  },
];

const COLUMNS: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

/**
 * KanbanBoard orchestrator - Manages main state and operations of the tasks.
 */
export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Drag and drop tracking
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ taskId: string; position: 'before' | 'after' } | null>(null);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('todo');

  // Get active assignee list from the DUMMY_USERS database
  const availableAssignees = useMemo(() => {
    return DUMMY_USERS.map((user) => user.name);
  }, []);

  // Compute metrics for board stats header
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, review, todo, pct };
  }, [tasks]);

  // Drag-and-drop placement reordering algorithm
  const handleMoveTask = (taskId: string, targetStatus: Task['status'], targetIndex?: number) => {
    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    // 1. Remove task from current array state
    const remainingTasks = tasks.filter((t) => t.id !== taskId);
    
    // 2. Formulate updated task with new status
    const updatedTask: Task = { ...taskToMove, status: targetStatus };

    // 3. Re-insert task based on targets
    if (typeof targetIndex === 'number') {
      // Find cards in target column and other columns
      const targetColTasks = remainingTasks.filter((t) => t.status === targetStatus);
      const otherColTasks = remainingTasks.filter((t) => t.status !== targetStatus);

      // Insert at the precise index
      targetColTasks.splice(targetIndex, 0, updatedTask);
      
      setTasks([...otherColTasks, ...targetColTasks]);
    } else {
      // Appending to the end of the column
      setTasks([...remainingTasks, updatedTask]);
    }
  };

  // Open modal in creation mode
  const handleCreateTaskOpen = (status: Task['status'] = 'todo') => {
    setEditingTask(null);
    setDefaultStatus(status);
    setIsModalOpen(true);
  };

  // Open modal in edit mode
  const handleEditTaskOpen = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Delete task with visual confirmation
  const handleDeleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  // Process Add/Edit form submission
  const handleFormSubmit = (data: TaskFormData) => {
    if (editingTask) {
      // Update
      setTasks(
        tasks.map((t) => (t.id === editingTask.id ? { ...t, ...data } : t))
      );
    } else {
      // Add
      const newTask: Task = {
        id: `task-${Date.now()}`,
        ...data,
      };
      setTasks([...tasks, newTask]);
    }
  };

  // Reset board back to initial state
  const handleResetBoard = () => {
    if (window.confirm('Reset all tasks back to default layout? This will clear custom edits.')) {
      setTasks(INITIAL_TASKS);
      setSearchQuery('');
      setFilterPriority('all');
      setFilterAssignee('all');
    }
  };

  // Reset only search filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterPriority('all');
    setFilterAssignee('all');
  };

  // Filter tasks based on Search terms, Priority, and Assignee selections
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
      
      const matchAssignee = filterAssignee === 'all' || task.assignee === filterAssignee;
      
      return matchSearch && matchPriority && matchAssignee;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  const hasActiveFilters = searchQuery !== '' || filterPriority !== 'all' || filterAssignee !== 'all';

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total stats */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800">
          <CardBody className="flex items-center gap-4 p-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Tasks</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{metrics.total}</h3>
            </div>
          </CardBody>
        </Card>

        {/* To Do Stats */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800">
          <CardBody className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">To Do</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{metrics.todo}</h3>
            </div>
          </CardBody>
        </Card>

        {/* In Progress Stats */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800">
          <CardBody className="flex items-center gap-4 p-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Progress</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{metrics.inProgress}</h3>
            </div>
          </CardBody>
        </Card>

        {/* Review Stats */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800">
          <CardBody className="flex items-center gap-4 p-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Under Review</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{metrics.review}</h3>
            </div>
          </CardBody>
        </Card>

        {/* Completed Stats Card with dynamic progress */}
        <Card variant="outlined" className="bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-900/50">
          <CardBody className="flex flex-col justify-center p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle size={14} />
                <span>Completion</span>
              </div>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{metrics.pct}%</span>
            </div>
            {/* Completion Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.pct}%` }}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 2. Search, Filters and Toolbar Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm">
        {/* Left Side: Search & Filter inputs */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-gray-200 transition-all"
            />
          </div>

          {/* Filter Priority */}
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <Filter size={14} className="text-gray-400 hidden sm:block" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:text-gray-200"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Filter Assignee */}
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <UserCheck size={14} className="text-gray-400 hidden sm:block" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:text-gray-200"
            >
              <option value="all">All Assignees</option>
              {availableAssignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline px-2 py-1 select-none"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Right Side: Actions (New Task & Reset Board) */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetBoard}
            className="flex items-center gap-2 px-3.5"
            title="Reset Board data"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleCreateTaskOpen('todo')}
            className="flex items-center gap-2 shadow-sm shadow-blue-500/10"
          >
            <Plus size={16} />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* 3. Horizontal Scrollable Kanban Columns Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800">
        <div className="flex gap-4 min-w-[1100px] h-[66vh] items-start">
          {COLUMNS.map((col) => {
            // Filter tasks matching the current column status and active filters
            const columnTasks = filteredTasks.filter((t) => t.status === col.key);

            return (
              <Column
                key={col.key}
                title={col.label}
                status={col.key}
                tasks={columnTasks}
                onEdit={handleEditTaskOpen}
                onDelete={handleDeleteTask}
                draggedTaskId={draggedTaskId}
                setDraggedTaskId={setDraggedTaskId}
                dropIndicator={dropIndicator}
                setDropIndicator={setDropIndicator}
                onMoveTask={handleMoveTask}
                onCreateTaskInColumn={handleCreateTaskOpen}
              />
            );
          })}
        </div>
      </div>

      {/* Empty board state when searching filters return 0 results globally */}
      {filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="py-12 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-w-md mx-auto my-6">
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">No tasks match your filters</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try resetting search parameters or select &quot;All Priorities&quot;.</p>
          <button
            onClick={handleClearFilters}
            className="mt-3.5 inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
          >
            Clear Search Filters
          </button>
        </div>
      )}

      {/* 4. Task Creation/Edit Modal wrapper */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        availableAssignees={availableAssignees}
        editTask={editingTask || (defaultStatus !== 'todo' ? {
          id: '',
          title: '',
          description: '',
          priority: 'medium',
          assignee: availableAssignees[0] || '',
          status: defaultStatus,
          dueDate: new Date().toISOString().split('T')[0],
        } : null)}
      />
    </div>
  );
}
