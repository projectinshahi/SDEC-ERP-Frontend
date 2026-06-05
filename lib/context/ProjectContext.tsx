'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchProjects } from '@/lib/api/projects';
import { Project } from '@/components/projects/ProjectCard';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  setActiveProject: (project: Project | null) => void;
  setActiveProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch projects if the user is logged in and doesn't need to change password
    if (!user || user.mustChangePassword) {
      setProjects([]);
      setActiveProjectState(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const data = await fetchProjects();
        if (isMounted) {
          setProjects(data);
          
          // Determine the active project
          const savedId = localStorage.getItem('activeProjectId');
          let currentActive = null;
          
          if (savedId) {
            currentActive = data.find(p => p.id === savedId) || null;
          }
          
          if (!currentActive && data.length > 0) {
            currentActive = data[0];
          }
          
          setActiveProjectState(currentActive);
          if (currentActive) {
            localStorage.setItem('activeProjectId', currentActive.id);
          } else {
            localStorage.removeItem('activeProjectId');
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem('activeProjectId', project.id);
    } else {
      localStorage.removeItem('activeProjectId');
    }
  };

  const setActiveProjectId = (id: string) => {
    const project = projects.find(p => p.id === id) || null;
    setActiveProject(project);
  };

  return (
    <ProjectContext.Provider value={{ projects, activeProject, isLoading, setActiveProject, setActiveProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
