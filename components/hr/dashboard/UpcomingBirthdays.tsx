'use client';

import { useEffect, useState } from 'react';
import { Cake, PackageOpen } from 'lucide-react';
import { fetchEmployees, type ApiEmployee } from '@/lib/api/hr';

interface BirthdayEvent {
    id: number;
    name: string;
    label: string;      // "Today" | "Tomorrow" | "15 Dec"
    daysRemaining: number;
    detail: string;     // e.g. "Birthday (Designation)"
}

interface UpcomingBirthdaysProps {
    loading?: boolean;
}

const INITIALS_COLORS = [
    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300',
    'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300',
    'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
];

/**
 * Always resolve a non-empty, safe display name. Employees whose profile isn't
 * linked to a user account (or whose linked user was removed) come back from the
 * API with a null/blank name — never let that reach the render layer.
 */
function displayName(name: string | null | undefined): string {
    return name && name.trim() ? name.trim() : 'Unknown Employee';
}

/** Parse dates and compute upcoming birthdays within next 30 days */
function computeBirthdays(employees: ApiEmployee[]): BirthdayEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events: BirthdayEvent[] = [];

    for (const emp of employees) {
        if (!emp.date_of_birth) continue;
        const dob = new Date(emp.date_of_birth);
        if (isNaN(dob.getTime())) continue;

        const birthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);

        const diffMs = birthday.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
            let label: string;
            if (diffDays === 0) label = 'Today';
            else if (diffDays === 1) label = 'Tomorrow';
            else {
                label = birthday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }

            events.push({
                id: emp.id,
                name: displayName(emp.name),
                label,
                daysRemaining: diffDays,
                detail: `Birthday (${emp.designation || 'Staff'})`,
            });
        }
    }

    // Sort by nearest first and slice to max 5
    return events.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5);
}

export function UpcomingBirthdays({ loading: parentLoading = false }: UpcomingBirthdaysProps) {
    const [employeesData, setEmployeesData] = useState<ApiEmployee[]>([]);
    const [localLoading, setLocalLoading] = useState(true);

    useEffect(() => {
        setLocalLoading(true);
        fetchEmployees()
            .then(setEmployeesData)
            .catch(() => setEmployeesData([]))
            .finally(() => setLocalLoading(false));
    }, []);

    const loading = parentLoading || localLoading;
    const displayedEvents = computeBirthdays(employeesData);

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <Cake size={14} />
                        </div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                            Upcoming Birthdays
                        </h2>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">
                        Next 30 days based on date of birth
                    </p>
                </div>
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                </div>
                                <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : displayedEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                        <PackageOpen size={28} className="text-gray-300 dark:text-gray-700" />
                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">
                            No upcoming birthdays
                        </p>
                    </div>
                ) : (
                    displayedEvents.map((event, idx) => {
                        const colorClass = INITIALS_COLORS[idx % INITIALS_COLORS.length];
                        const initial = (event.name.charAt(0) || '?').toUpperCase();
                        const isToday = event.daysRemaining === 0;
                        const itemColorClass = isToday
                            ? 'border-blue-100 dark:border-blue-900/30 bg-blue-50/60 dark:bg-blue-950/15'
                            : 'border-gray-100 dark:border-gray-850 bg-gray-50/40 dark:bg-gray-800/10';

                        return (
                            <div
                                key={event.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${itemColorClass}`}
                            >
                                {/* Avatar */}
                                <div className={`w-9 h-9 rounded-xl text-sm font-black flex items-center justify-center shrink-0 ${colorClass}`}>
                                    {initial}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate">{event.name}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Cake size={10} className="text-blue-400 shrink-0" />
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{event.detail}</span>
                                    </div>
                                </div>

                                {/* Date badge */}
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${isToday
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {event.label}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
