
import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  isDashboard?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ isDashboard }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-12 px-4 mt-auto border-t border-gray-100 bg-white text-gray-500">
      <div className={`${isDashboard ? 'w-full' : 'max-w-5xl mx-auto px-6'} flex flex-col md:flex-row justify-between items-center gap-8`}>
        
        <div className="flex items-center gap-4">
           {/* 
             Left Alignment Spacer for Dashboard:
             Matches the Header's Sidebar Toggle Button layout footprint to align Footer text with Breadcrumbs.
           */}
           {isDashboard && (
             <div className="hidden md:block w-9 h-9 -ml-2 flex-shrink-0" aria-hidden="true" />
           )}
           
           <div className="flex flex-col md:flex-row items-center gap-2 md:gap-8">
              <span className="font-bold text-gray-900 tracking-tight text-sm">© {currentYear} LenserFight</span>
              <span className="hidden md:inline text-gray-300">|</span>
              <span className="text-xs text-gray-400">Powered by ConnectLens Protocol</span>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium">
               <Link to="/about" className="hover:text-gray-900 transition-colors">About</Link>
               <Link to="/ecosystem" className="hover:text-gray-900 transition-colors">Ecosystem</Link>
               <Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
               <Link to="/legal" className="hover:text-gray-900 transition-colors">Legal</Link>
            </div>
            {/* 
             Right Alignment Spacer for Dashboard
           */}
            {isDashboard && (
                <div className="hidden md:block w-9 h-9 -mr-2 flex-shrink-0" aria-hidden="true" />
            )}
        </div>
      </div>
    </footer>
  );
};
