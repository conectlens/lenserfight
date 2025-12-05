
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface FooterProps {
  isDashboard?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ isDashboard }) => {
  const currentYear = new Date().getFullYear();
  const { theme, toggleTheme } = useTheme();

  return (
    <footer className="w-full py-12 px-4 mt-auto border-t border-gray-100 bg-white text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 transition-colors duration-200">
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
              <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight text-sm">© {currentYear} LenserFight</span>
              <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Powered by ConnectLens Protocol</span>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium">
               <Link to="/about" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">About</Link>
               <Link to="/ecosystem" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Ecosystem</Link>
               <Link to="/contact" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Contact</Link>
               <Link to="/legal" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Legal</Link>
            </div>
            
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

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