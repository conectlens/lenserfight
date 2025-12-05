
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { useAuth } from '../context/AuthContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === '/about' && location.pathname.startsWith('/about')) return true;
    if (path === '/ecosystem' && location.pathname.startsWith('/ecosystem')) return true;
    if (path === '/legal' && location.pathname.startsWith('/legal')) return true;
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans antialiased transition-colors duration-200">
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 flex items-center justify-center transition-transform group-hover:scale-105">
                 <img 
                   src="https://cdn.lenserfight.conectlens.com/brand/lenserfight-logo.png" 
                   alt="LenserFight" 
                   className="w-full h-full object-contain"
                 />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">LenserFight</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-gray-500 dark:text-gray-400">
              <Link to="/about" className={`hover:text-gray-900 dark:hover:text-white transition-colors ${isActive('/about') ? 'text-gray-900 dark:text-white font-bold' : ''}`}>About</Link>
              <Link to="/ecosystem" className={`hover:text-gray-900 dark:hover:text-white transition-colors ${isActive('/ecosystem') ? 'text-gray-900 dark:text-white font-bold' : ''}`}>Ecosystem</Link>
              <Link to="/legal" className={`hover:text-gray-900 dark:hover:text-white transition-colors ${isActive('/legal') ? 'text-gray-900 dark:text-white font-bold' : ''}`}>Legal</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/')} 
                className="h-10 px-6 bg-primary text-gray-900 font-bold text-sm rounded-lg hover:bg-[#ffe170] transition-colors"
              >
                Enter Arena
              </button>
            ) : (
              <button 
                onClick={() => navigate('/login')} 
                className="h-10 px-6 bg-primary text-gray-900 font-bold text-sm rounded-lg hover:bg-[#ffe170] shadow-sm hover:shadow transition-all"
              >
                Join
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {children}
      </main>

      <Footer />
    </div>
  );
};
