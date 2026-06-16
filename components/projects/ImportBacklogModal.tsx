import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useToast } from '@/lib/hooks/useToast';

/**
 * Quote-aware CSV parser → array of header-keyed row objects (same shape the
 * XLSX path produces, so both feed the shared normalization/validation).
 * Handles quoted fields, escaped "" quotes, commas/newlines inside quotes,
 * CRLF line endings and a leading BOM.
 */
function parseCsv(text: string): Record<string, any>[] {
  const clean = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== '')) // drop blank lines
    .map((r) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = (r[idx] ?? '').trim();
      });
      return obj;
    });
}

interface ImportBacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tasks: any[]) => Promise<void>;
  isImporting: boolean;
}

export function ImportBacklogModal({ isOpen, onClose, onImport, isImporting }: ImportBacklogModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Shared normalization + validation for both CSV and XLSX rows: maps loose
   * header names to the canonical columns the backend expects, then keeps only
   * rows with a Board and Task Title (warning about skipped rows).
   */
  const processRows = (json: any[]) => {
    const normalizedJson = json.map((row: any) => {
      const newRow: any = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim().toLowerCase();
        if (cleanKey === 'board' || cleanKey === 'sprint') newRow['Board'] = row[key];
        else if (cleanKey === 'task title' || cleanKey === 'title' || cleanKey === 'taskname' || cleanKey === 'task name' || cleanKey === 'task') newRow['Task Title'] = row[key];
        else if (cleanKey === 'description' || cleanKey === 'desc') newRow['Description'] = row[key];
        else if (cleanKey === 'priority') newRow['Priority'] = row[key];
        else if (cleanKey === 'status' || cleanKey === 'state') newRow['Status'] = row[key];
        else if (cleanKey.includes('assign')) newRow['Assign User'] = row[key];
        else if (cleanKey.includes('due') || cleanKey.includes('date')) newRow['Due Date'] = row[key];
        else if (cleanKey.includes('point') || cleanKey === 'story points') newRow['Points'] = row[key];
        else newRow[key.trim()] = row[key];
      });
      return newRow;
    });

    // Validate basic structure
    if (!Array.isArray(normalizedJson) || normalizedJson.length === 0) {
      setError('The file is empty or invalid.');
      setParsedData(null);
      return;
    }

    // Keep rows with both a Board and a Task Title; surface a warning for the rest.
    const validRows = normalizedJson.filter((row) => row['Board'] && row['Task Title']);

    if (validRows.length === 0) {
      setError('Missing required columns or data. Ensure "Board" (or Sprint) and "Task Title" exist in at least one row.');
      setParsedData(null);
      return;
    }

    if (validRows.length < normalizedJson.length) {
      toast(`Warning: ${normalizedJson.length - validRows.length} rows have missing Board or Task Title and will be skipped.`, 'warning');
    }

    setParsedData(validRows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setParsedData(null);
      setError(null);
      return;
    }

    setFile(selected);
    setError(null);

    const isCsv = selected.name.toLowerCase().endsWith('.csv');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const json: any[] = [];

        if (isCsv) {
          // CSV path — decode + parse into header-keyed rows, then run the SAME
          // normalization/validation pipeline as XLSX.
          const csvText = new TextDecoder('utf-8').decode(buffer);
          const csvRows = parseCsv(csvText);
          if (csvRows.length === 0) {
            setError('The CSV file is empty or has no data rows.');
            setParsedData(null);
            return;
          }
          json.push(...csvRows);
        } else {
          // XLSX path (unchanged) — parse the first worksheet via ExcelJS.
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];

          if (!worksheet) {
            setError('No worksheets found in the Excel file.');
            setParsedData(null);
            return;
          }

          const headers: string[] = [];

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              row.eachCell((cell, colNumber) => {
                let val = cell.value;
                if (typeof val === 'object' && val !== null) {
                  if ('text' in val) val = (val as any).text;
                  else if ('richText' in val) val = (val as any).richText.map((rt: any) => rt.text).join('');
                }
                headers[colNumber] = val?.toString().trim() || '';
              });
            } else {
              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                  // If it's a date, convert it properly. Or if it's a rich text object.
                  let val = cell.value;
                  if (typeof val === 'object' && val !== null) {
                    if ('text' in val) val = (val as any).text;
                    else if ('richText' in val) val = (val as any).richText.map((rt: any) => rt.text).join('');
                    else if (val instanceof Date) val = val.toISOString().split('T')[0];
                  }
                  // Handle formula values
                  if (val && typeof val === 'object' && 'result' in val) {
                    val = (val as any).result;
                  }
                  rowData[header] = val;
                }
              });
              json.push(rowData);
            }
          });
        }

        processRows(json);
      } catch (err: any) {
        console.error('Error parsing file:', err);
        setError('Failed to parse the file. Please ensure it is a valid .xlsx or .csv file.');
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setError('Error reading file.');
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData || parsedData.length === 0) {
      toast('Please upload a valid file with tasks.', 'error');
      return;
    }

    await onImport(parsedData);
  };

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedData(null);
      setError(null);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Backlog" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a CSV or Excel file to automatically create sprints (boards) and import tasks.
          </p>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Upload size={32} className="text-gray-400 mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Select a CSV or Excel file to import
            </p>
            <p className="text-xs text-gray-500 mb-4">.XLSX and .CSV files</p>

            <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <span>Browse Files</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800/30">
            <FileText size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{file.name}</p>
              {parsedData && (
                <p className="text-xs opacity-80">{parsedData.length} rows detected</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-800/30">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isImporting}
            disabled={!parsedData || !!error || isImporting}
          >
            Import Data
          </Button>
        </div>
      </form>
    </Modal>
  );
}
