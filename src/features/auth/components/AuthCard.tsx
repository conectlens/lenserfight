import React from 'react';

export const AuthCard: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-full border-2 border-gray-900 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <circle cx="12" cy="12" r="10" strokeWidth="2" />
               <circle cx="12" cy="12" r="3" strokeWidth="2" />
               <line x1="12" y1="2" x2="12" y2="4" strokeWidth="2" />
               <line x1="12" y1="20" x2="12" y2="22" strokeWidth="2" />
               <line x1="2" y1="12" x2="4" y2="12" strokeWidth="2" />
               <line x1="20" y1="12" x2="22" y2="12" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};