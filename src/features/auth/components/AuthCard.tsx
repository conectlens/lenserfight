import React from 'react';

export const AuthCard: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-20 w-20 flex items-center justify-center mb-4">
            <img 
              src="https://cdn.lenserfight.conectlens.com/brand/lenserfight-logo.png" 
              alt="LenserFight Logo" 
              className="w-full h-full object-contain"
            />
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