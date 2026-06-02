'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Search, CheckSquare } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { CreateBoardModal } from '@/components/boards/CreateBoardModal';
import { fetchBoards as fetchBoardsApi, type Board } from '@/lib/api/kanban';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface SidebarBoardsItemProps {
  active: boolean;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mounted: boolean;
  onMobileToggle: () => void;
}
//uyfds

export function SidebarBoardsItem({ active, isCollapsed, setIsCollapsed, mounted, onMobileToggle }: SidebarBoardsItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (active) {
      loadBoards();
      setIsOpen(true);
    }
  }, [active]);
  //   useEffect(() => {
  //   if (active) {
  //     setIsOpen(true);
  //     loadBoards();
  //   }
  // }, [active]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBoards = async () => {
    try {
      setIsLoading(true);
      const data = await fetchBoardsApi();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards', err);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleToggle = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   if (!isOpen) {
  //     loadBoards();
  //   }
  //   setIsOpen(!isOpen);
  // };
  //   const handleToggle = (e: React.MouseEvent) => {
  //   e.preventDefault();

  //   if (isCollapsed) {
  //     return;
  //   }

  //   if (!isOpen) {
  //     loadBoards();
  //   }

  //   setIsOpen(!isOpen);
  // };
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isCollapsed) {
      setIsCollapsed(false);

      localStorage.setItem('sidebar-collapsed', 'false');

      loadBoards();

      setIsOpen(true);

      return;
    }

    if (!isOpen) {
      loadBoards();
    }

    setIsOpen(!isOpen);
  };
  const handleSelectBoard = (id: number) => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onMobileToggle();
    }
    router.push(`/dashboard/tasks?boardId=${id}`);
  };

  const filteredBoards = boards.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <div className="relative group" ref={popoverRef}>
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        //       className={classNames(
        //         'flex items-center rounded-xl py-3 relative w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        //         mounted ? 'transition-all duration-200 ease-out' : '',
        //         isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'justify-between px-4 mx-2',
        //         // active || isOpen
        //         //   ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-indigo-500/10 font-semibold'
        //         //   : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100'
        //         active
        // ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-indigo-500/10 font-semibold'
        //       )}
        className={classNames(
          'flex items-center rounded-xl py-3 relative w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          mounted ? 'transition-all duration-200 ease-out' : '',
          isCollapsed ? 'justify-center w-12 h-12 mx-auto px-0' : 'justify-between px-4 mx-2',
          active
            ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-indigo-500/10 font-semibold'
            : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100'
        )}
      >
        <div className="flex items-center gap-3">
          {/* {(active || isOpen) && ( */}
          {active && (
            <span className={classNames(
              'absolute rounded-r bg-blue-400 shadow-[0_0_8px_#60a5fa]',
              isCollapsed ? 'left-[-4px] top-1/4 h-1/2 w-1' : 'left-0 top-1/4 h-1/2 w-1.5'
            )} />
          )}

          {/* <CheckSquare
            size={20}
            className={classNames(
              'transition-transform duration-200 group-hover:scale-105 flex-shrink-0',
              active
  ? 'text-white': 'text-zinc-400 group-hover:text-zinc-200'
            )}
          /> */}
          <CheckSquare
            size={20}
            className={classNames(
              'transition-transform duration-200 group-hover:scale-105 flex-shrink-0',
              active
                ? 'text-white'
                : 'text-zinc-400 group-hover:text-zinc-100'
            )}
          />

          {!isCollapsed && (
            // <span className="text-sm tracking-wide">Boards</span>
            <span
              className={classNames(
                'text-sm tracking-wide',
                active ? 'text-white font-semibold' : 'text-zinc-400'
              )}
            >
              Boards
            </span>
          )}
        </div>

        {!isCollapsed && (
          <ChevronRight
            size={16}
            className={classNames(
              "transition-transform duration-200 text-zinc-400",
              isOpen ? "rotate-90 text-white" : "group-hover:text-zinc-200"
            )}
          />
        )}
      </button>

      {/* Boards Panel: Inline Accordion */}
      {isOpen && (
        <div
          className={classNames(
            "z-[100] bg-zinc-900 border border-zinc-800 overflow-hidden animate-in fade-in duration-200",
            "relative mt-2 mx-2 w-auto rounded-lg shadow-inner",
            // isCollapsed && "hidden md:block absolute left-full top-0 ml-4 w-64 shadow-2xl"
            //             isCollapsed &&
            // "hidden md:block fixed left-20 top-32 w-72 shadow-2xl z-[9999]"
            isCollapsed &&
            "hidden md:block absolute left-full top-0 ml-3 w-72 shadow-2xl z-[9999]"
          )}
        >
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/80">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-zinc-200">Your Boards</h3>
              {hasPermission('task.board.create') && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-md transition-colors"
                  title="Create Board"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {isLoading ? (
              <div className="py-6 text-center text-zinc-500 text-sm animate-pulse">Loading boards...</div>
            ) : filteredBoards.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-sm">No boards found</div>
            ) : (
              <div className="space-y-1">
                {filteredBoards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => handleSelectBoard(board.id)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-zinc-800 transition-colors group/item"
                  >
                    <div className="text-sm font-medium text-zinc-200 group-hover/item:text-white">{board.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{board.projectName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip in collapsed mode */}
      {isCollapsed && !isOpen && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
          Boards
        </div>
      )}

      {/* Create Board Modal integration */}
      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newBoardId) => {
          loadBoards();
          setIsOpen(false);
          router.push(`/dashboard/tasks?boardId=${newBoardId}`);
        }}
      />
    </div>
  );
}
