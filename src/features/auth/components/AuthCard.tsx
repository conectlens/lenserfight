
import React from 'react';

export const AuthCard: React.FC<{ 
  children: React.ReactNode; 
  title: string; 
  subtitle?: string;
  backButton?: React.ReactNode;
}> = ({ children, title, subtitle, backButton }) => {
  return (
    <div className="min-h-screen flex flex-col md:justify-center items-center bg-gray-50 p-4 relative">
      {backButton && (
        <div className="w-full md:absolute md:top-6 md:left-6 z-10 mb-6 md:mb-0">
          {backButton}
        </div>
      )}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="h-24 w-24 flex items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <img 
                src="https://cdn.lenserfight.conectlens.com/brand/lenserfight-logo.png" 
                alt="LenserFight Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="absolute -top-3 -right-6 bg-gradient-to-br from-primary to-yellow-400 text-gray-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md transform rotate-6 border border-white/40 select-none z-10">
              Beta
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-2 font-medium">{subtitle}</p>}
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
