import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

interface InlineEditableTextProps {
  value: string;
  onSave: (val: string) => Promise<void> | void;
  type?: 'text' | 'textarea';
  permission?: boolean;
  placeholder?: string;
  textClassName?: string;
  inputClassName?: string;
}

export function InlineEditableText({
  value,
  onSave,
  type = 'text',
  permission = true,
  placeholder = 'Click to add text...',
  textClassName = '',
  inputClassName = ''
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!permission) return;
    
    const trimmed = currentValue.trim();
    if (trimmed === value) {
      setIsEditing(false);
      return;
    }

    try {
      setIsLoading(true);
      await onSave(trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed', err);
      toast('Failed to update value.', 'error');
      setCurrentValue(value); // revert
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    } else if (e.key === 'Enter' && type === 'text') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && type === 'textarea') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isEditing) {
    return (
      <div 
        className={`group relative rounded-md transition-colors ${permission ? 'cursor-text hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
        onClick={() => permission && setIsEditing(true)}
      >
        <div className={`py-1 px-1.5 min-h-[1.5rem] break-words ${!value ? 'text-gray-400 italic' : ''} ${textClassName}`}>
          {value ? (
             type === 'textarea' ? (
               <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 pointer-events-none">
                 {value}
               </div>
             ) : (
               value
             )
          ) : placeholder}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1 w-full">
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={4}
          className={`w-full p-2 border-2 border-blue-500 rounded-md shadow-sm outline-none bg-white dark:bg-gray-900 focus:ring-0 text-sm ${inputClassName}`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className={`w-full p-1.5 border-2 border-blue-500 rounded-md shadow-sm outline-none bg-white dark:bg-gray-900 focus:ring-0 text-sm ${inputClassName}`}
        />
      )}
      
      <div className="flex items-center gap-1 mt-1 justify-end">
        <button 
          onClick={() => {
            setCurrentValue(value);
            setIsEditing(false);
          }}
          disabled={isLoading}
          className="p-1 text-gray-500 hover:bg-gray-200 rounded transition-colors"
          title="Cancel (Esc)"
        >
          <X size={16} />
        </button>
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="p-1 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          title="Save (Enter)"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}
