'use client';

import { Shield, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import type { Permission } from '@/lib/types/user-management';
import { classNames } from '@/lib/utils';

interface CheckboxGroupProps {
  label: string;
  permissions: Permission[];
  selected: string[];
  onChange: (selected: string[]) => void;
  error?: string;
  required?: boolean;
}

export function CheckboxGroup({
  label,
  permissions,
  selected,
  onChange,
  error,
  required,
}: CheckboxGroupProps) {
  // Group permissions by category
  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleToggleSingle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleToggleCategory = (category: string, catPermissions: Permission[]) => {
    const catPermissionIds = catPermissions.map((p) => p.id);
    const allSelected = catPermissionIds.every((id) => selected.includes(id));

    if (allSelected) {
      // Remove all in this category
      onChange(selected.filter((id) => !catPermissionIds.includes(id)));
    } else {
      // Add missing ones
      const newSelections = [...selected];
      catPermissionIds.forEach((id) => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      onChange(newSelections);
    }
  };

  const handleSelectAllGlobal = () => {
    const allIds = permissions.map((p) => p.id);
    const isAllSelected = allIds.every((id) => selected.includes(id));

    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(allIds);
    }
  };

  const isAllGlobalSelected = permissions.map((p) => p.id).every((id) => selected.includes(id));

  return (
    <div className="space-y-3.5 w-full">
      {/* Header and Select All Global button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-gray-100">
        <div>
          <label className="block text-sm font-bold text-gray-800 transition-colors duration-150">
            {label}
            {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </label>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            Currently selected: {selected.length} of {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSelectAllGlobal}
          className={classNames(
            'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 self-start sm:self-center',
            isAllGlobalSelected
              ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
          )}
        >
          {isAllGlobalSelected ? (
            <>
              <Square size={14} />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare size={14} />
              Select All Permissions
            </>
          )}
        </button>
      </div>

      {/* Categorized Permissions Panels */}
      <div className="max-h-[380px] overflow-y-auto pr-1 border border-gray-200/80 rounded-xl p-4 divide-y divide-gray-100/70 space-y-5 bg-white shadow-inner">
        {Object.entries(grouped).map(([category, catPermissions], idx) => {
          const catPermissionIds = catPermissions.map((p) => p.id);
          const isCatAllSelected = catPermissionIds.every((id) => selected.includes(id));
          const catSelectedCount = catPermissionIds.filter((id) => selected.includes(id)).length;

          return (
            <div key={category} className={classNames('space-y-2.5', idx > 0 && 'pt-4')}>
              {/* Category Header */}
              <div className="flex justify-between items-center bg-gray-50/70 py-1.5 px-2.5 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-blue-500" />
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{category}</h4>
                  <span className="text-[10px] font-semibold bg-gray-200/75 text-gray-600 py-0.5 px-1.5 rounded-full">
                    {catSelectedCount}/{catPermissions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(category, catPermissions)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {isCatAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Category Items list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                {catPermissions.map((permission) => {
                  const isChecked = selected.includes(permission.id);
                  return (
                    <label
                      key={permission.id}
                      onClick={() => handleToggleSingle(permission.id)}
                      className={classNames(
                        'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150',
                        isChecked
                          ? 'bg-blue-50/15 border-blue-200 ring-2 ring-blue-500/5'
                          : 'bg-white border-gray-150 hover:border-gray-250 hover:bg-gray-50/30'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Controlled via label onClick
                        className="w-4 h-4 mt-0.5 text-blue-600 border-gray-200 rounded focus:ring-blue-500/20 focus:ring-2 cursor-pointer transition-all flex-shrink-0"
                      />
                      <div className="flex-1 leading-none">
                        <p className={classNames('text-xs font-bold text-gray-800 transition-colors', isChecked && 'text-blue-600')}>
                          {permission.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                          {permission.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-slide-down">
          <ShieldAlert size={12} className="inline flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
