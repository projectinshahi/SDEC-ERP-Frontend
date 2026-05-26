'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, User, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Badge } from '@/components/Badge';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed';
  members: string[];
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  is_archived?: boolean;
}

export interface ProjectMember {
  id: string | number;
  project_id: string;
  userId: number;
  role: 'admin' | 'editor' | 'viewer';
  name: string;
  email: string;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project, e: React.MouseEvent) => void;
  onArchive?: (project: Project, e: React.MouseEvent) => void;
  onRestore?: (project: Project, e: React.MouseEvent) => void;
  onDelete?: (project: Project, e: React.MouseEvent) => void;
}

// Helper to get a stable background color based on name initials
const getAvatarBgColor = (name: string) => {
  const colors = [
    'bg-blue-500 text-white',
    'bg-indigo-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-cyan-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function ProjectCard({ project, onEdit, onArchive, onRestore, onDelete }: ProjectCardProps) {
  // Format the date beautifully (e.g., "May 25, 2026")
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div 
        className="group flex flex-col justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full min-h-[220px]"
        role="button"
        tabIndex={0}
        aria-label={`Project: ${project.name}, Status: ${project.status}`}
      >
        <div className="space-y-3">
          {/* Header row: Project Title & Status / Actions */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-1">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {project.is_archived ? (
                <>
                  {onRestore && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRestore(project, e);
                      }}
                      className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md text-emerald-500 dark:text-emerald-400 transition-all duration-200 cursor-pointer"
                      aria-label={`Restore project ${project.name}`}
                      title="Restore Project"
                    >
                      <ArchiveRestore size={13} className="stroke-[2.5]" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(project, e);
                      }}
                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-gray-400 hover:text-rose-500 dark:text-rose-400 transition-all duration-200 cursor-pointer"
                      aria-label={`Delete project ${project.name}`}
                      title="Permanently Delete Project"
                    >
                      <Trash2 size={13} className="stroke-[2.5]" />
                    </button>
                  )}
                  <Badge 
                    variant="default" 
                    className="capitalize font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 tracking-wide text-[10px] px-2 py-0.5 border border-gray-200 dark:border-gray-600 shadow-xs"
                  >
                    Archived
                  </Badge>
                </>
              ) : (
                <>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit(project, e);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-md text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 cursor-pointer"
                      aria-label={`Edit project ${project.name}`}
                      title="Edit Project"
                    >
                      <Pencil size={13} className="stroke-[2.5]" />
                    </button>
                  )}
                  {onArchive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onArchive(project, e);
                      }}
                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-gray-400 hover:text-rose-500 dark:text-rose-400 transition-all duration-200 cursor-pointer"
                      aria-label={`Archive project ${project.name}`}
                      title="Archive Project"
                    >
                      <Archive size={13} className="stroke-[2.5]" />
                    </button>
                  )}
                  <Badge 
                    variant={project.status === 'active' ? 'success' : 'default'} 
                    className="capitalize font-semibold tracking-wide text-[10px] px-2 py-0.5"
                  >
                    {project.status}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Footer row: Members Pile & Updated Date */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50 dark:border-gray-700/40">
          {/* Overlapping member initials avatar pile */}
          <div className="flex items-center">
            <div className="flex -space-x-2 overflow-hidden">
              {project.members.slice(0, 3).map((member, i) => {
                const initials = member.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div
                    key={i}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ring-2 ring-white dark:ring-gray-800 shadow-sm ${getAvatarBgColor(member)}`}
                    title={member}
                  >
                    {initials || <User size={10} />}
                  </div>
                );
              })}
              {project.members.length > 3 && (
                <div
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold ring-2 ring-white dark:ring-gray-800 shadow-sm"
                  title={`${project.members.length - 3} more members`}
                >
                  +{project.members.length - 3}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-2">
              {project.members.length} {project.members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          {/* Last Updated Timestamp */}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            <Calendar size={12} className="opacity-75" />
            <span>{formatDate(project.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
