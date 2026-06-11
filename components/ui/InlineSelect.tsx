import React, { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';

export interface InlineSelectOption {
  label: string;
  value: string;
  colorClass?: string; // Optional custom Tailwind classes for the badge/text
}

interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onSave: (val: string) => Promise<void> | void;
  permission?: boolean;
  className?: string;
  renderValue?: (val: string, option?: InlineSelectOption) => React.ReactNode;
}

export function InlineSelect({
  value,
  options,
  onSave,
  permission = true,
  className = '',
  renderValue
}: InlineSelectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const selectedOption = options.find(o => o.value === value);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    if (newVal === value) return;

    try {
      setIsLoading(true);
      await onSave(newVal);
    } catch (err) {
      console.error('Save failed', err);
      toast('Failed to update field.', 'error');
      // Because we rely on the parent's `value` prop to change if successful, 
      // if it fails, the parent's `value` won't update, so it implicitly reverts.
    } finally {
      setIsLoading(false);
    }
  };

  // If no permission, just render static
  if (!permission) {
    if (renderValue) return <>{renderValue(value, selectedOption)}</>;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${selectedOption?.colorClass || 'bg-gray-100 text-gray-800'}`}>
        {selectedOption?.label || value}
      </span>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-md">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <select
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        className={`appearance-none bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 pr-6 rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm w-full ${selectedOption?.colorClass || 'text-gray-700 dark:text-gray-200'}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundPosition: 'right 4px center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '14px'
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="text-gray-900 bg-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
