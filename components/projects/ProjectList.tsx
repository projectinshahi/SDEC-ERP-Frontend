'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Project } from './ProjectCard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { classNames } from '@/lib/utils';
import { projectStatusLabel, projectStatusBadgeClass, projectCategoryBadgeClass } from '@/lib/projects/projectStatus';

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project, e: React.MouseEvent) => void;
  onArchive?: (project: Project, e: React.MouseEvent) => void;
  onRestore?: (project: Project, e: React.MouseEvent) => void;
  onDelete?: (project: Project, e: React.MouseEvent) => void;
}

// Helper to get initials avatar background
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

export function ProjectList({ projects, onEdit, onArchive, onRestore, onDelete }: ProjectListProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('project.edit');
  const canDelete = hasPermission('project.delete');

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

  const handleRowClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const showActionsColumn = !!(onEdit || onArchive || onRestore);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/40">
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">
              Project Name
            </th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
              Description
            </th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">
              Members
            </th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/12 text-center">
              Status
            </th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/12 text-center">
              Category
            </th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/12 text-right">
              Last Updated
            </th>
            {showActionsColumn && (
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/12 text-center">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30">
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => handleRowClick(project.id)}
              className="hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-colors duration-150 cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(project.id);
                }
              }}
              aria-label={`Project: ${project.name}, Status: ${project.status}`}
            >
              {/* Project Name */}
              <td className="px-6 py-4.5 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-950 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                  {project.name}
                </span>
              </td>

              {/* Description */}
              <td className="px-6 py-4.5">
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-sm leading-relaxed">
                  {project.description}
                </p>
              </td>

              {/* Members Avatar Pile */}
              <td className="px-6 py-4.5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {project.members.slice(0, 3).map((member, i) => {
                      const initials = member.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div
                          key={i}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-extrabold ring-2 ring-white dark:ring-gray-800 shadow-sm ${getAvatarBgColor(member)}`}
                          title={member}
                        >
                          {initials || <User size={8} />}
                        </div>
                      );
                    })}
                    {project.members.length > 3 && (
                      <div
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-extrabold ring-2 ring-white dark:ring-gray-800 shadow-sm"
                        title={`${project.members.length - 3} more members`}
                      >
                        +{project.members.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col ml-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      ({project.members.length})
                    </span>
                    {project.memberDetails && project.memberDetails.reduce((sum, m) => sum + (m.capacityPoints || 0), 0) > 0 && (
                      <span className="text-[10px] font-bold text-indigo-500 mt-0.5 whitespace-nowrap">
                        {project.memberDetails.reduce((sum, m) => sum + (m.capacityPoints || 0), 0)} pts/d
                      </span>
                    )}
                  </div>
                </div>
              </td>

              {/* Status Badge */}
              <td className="px-6 py-4.5 whitespace-nowrap text-center">
                <span className={classNames('inline-flex items-center font-semibold text-[10px] px-2.5 py-0.5 tracking-wide rounded-md border whitespace-nowrap', projectStatusBadgeClass(project.status))}>
                  {projectStatusLabel(project.status)}
                </span>
              </td>

              {/* Category Badge */}
              <td className="px-6 py-4.5 whitespace-nowrap text-center">
                {project.category ? (
                  <span className={classNames('inline-flex items-center font-semibold text-[10px] px-2.5 py-0.5 tracking-wide rounded-md border whitespace-nowrap', projectCategoryBadgeClass(project.category))}>
                    {project.category}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                )}
              </td>

              {/* Last Updated */}
              <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs text-gray-400 dark:text-gray-500 font-medium">
                <div className="flex items-center justify-end gap-1.5">
                  <Calendar size={13} className="opacity-70" />
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </td>

              {/* Actions columns */}
              {showActionsColumn && (
                <td className="px-6 py-4.5 whitespace-nowrap text-center text-xs font-medium">
                  <div className="flex items-center justify-center gap-1.5">
                    {project.is_archived ? (
                      <>
                        {onRestore && canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRestore(project, e);
                            }}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md text-emerald-500 dark:text-emerald-400 transition-all duration-200 cursor-pointer"
                            aria-label={`Restore project ${project.name}`}
                            title="Restore Project"
                          >
                            <ArchiveRestore size={14} className="stroke-[2.5]" />
                          </button>
                        )}
                        {onDelete && canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete(project, e);
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-gray-400 hover:text-rose-500 dark:text-rose-400 transition-all duration-200 cursor-pointer"
                            aria-label={`Delete project ${project.name}`}
                            title="Permanently Delete Project"
                          >
                            <Trash2 size={14} className="stroke-[2.5]" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {onEdit && canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEdit(project, e);
                            }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-md text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200 cursor-pointer"
                            aria-label={`Edit project ${project.name}`}
                            title="Edit Project"
                          >
                            <Pencil size={14} className="stroke-[2.5]" />
                          </button>
                        )}
                        {onArchive && canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onArchive(project, e);
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-gray-400 hover:text-rose-500 dark:text-rose-400 transition-all duration-200 cursor-pointer"
                            aria-label={`Archive project ${project.name}`}
                            title="Archive Project"
                          >
                            <Archive size={14} className="stroke-[2.5]" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
