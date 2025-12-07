
import React from 'react';
import { Check } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  isSuccess?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Loading...", isSuccess = false }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-md animate-in fade-in duration-300 transition-all">
        <div className="flex flex-col items-center gap-8 transform transition-all duration-500">
            {isSuccess ? (
                <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-500 shadow-xl shadow-green-200/50 dark:shadow-none ring-4 ring-white dark:ring-gray-900">
                    <Check className="w-12 h-12 text-green-600 dark:text-green-400" strokeWidth={4} />
                </div>
            ) : (
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full animate-pulse"></div>
                    </div>
                </div>
            )}
            
            <p className={`text-2xl font-bold text-gray-900 dark:text-white tracking-tight ${!isSuccess ? 'animate-pulse' : ''}`}>
                {message}
            </p>
        </div>
    </div>
  );
};
