
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T>({ columns, data, keyExtractor, isLoading, emptyState, pagination }: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="w-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((item, index) => (
              <tr key={keyExtractor(item)} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-6 py-4 text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                    {col.render ? col.render(item, index) : (col.accessor ? String(item[col.accessor]) : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/30">
           <p className="text-xs text-gray-500 dark:text-gray-400">
              Page <span className="font-medium text-gray-900 dark:text-gray-200">{pagination.currentPage}</span> of <span className="font-medium text-gray-900 dark:text-gray-200">{pagination.totalPages}</span>
           </p>
           <div className="flex gap-2">
              <button 
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                 <ChevronRight size={16} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}