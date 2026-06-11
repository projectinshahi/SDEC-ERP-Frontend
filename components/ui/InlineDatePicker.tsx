import React, { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { format } from 'date-fns';

interface InlineDatePickerProps {
  value: string | Date | null | undefined; // ISO string or Date object
  onSave: (val: string | null) => Promise<void> | void;
  permission?: boolean;
  className?: string;
  placeholder?: string;
}

export function InlineDatePicker({
  value,
  onSave,
  permission = true,
  className = '',
  placeholder = 'Select date'
}: InlineDatePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formattedValue = value ? (typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0]) : '';
  const displayValue = value ? format(new Date(value), 'MMM d, yyyy') : placeholder;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value || null;
    
    // Prevent save if it's the same
    if (newVal === formattedValue) return;

    try {
      setIsLoading(true);
      await onSave(newVal);
    } catch (err) {
      console.error('Save failed', err);
      toast('Failed to update date.', 'error');
      // Reverts automatically as value prop won't change
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <span className={`text-sm text-gray-800 dark:text-gray-200 ${!value ? 'italic text-gray-400' : ''}`}>
        {displayValue}
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
      
      {/* We use a visually hidden actual date input that is absolutely positioned over a nice looking label. 
          Alternatively, we can just style the date input to look like text, which is easier. */}
      <input
        type="date"
        value={formattedValue}
        onChange={handleChange}
        disabled={isLoading}
        className="appearance-none bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors font-medium text-sm text-gray-700 dark:text-gray-200 w-auto min-w-[130px]"
      />
    </div>
  );
}
