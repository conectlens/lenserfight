
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 px-6 mt-auto border-t border-gray-200 bg-gray-50 text-gray-500 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1">
           <span>&copy; 2025 - {currentYear} - LenserFight by <a href="https://connectlens.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">LenserFight</a></span>
        </div>
        
        <div className="flex items-center gap-6">
           <Link to="/terms" target="_blank" className="hover:text-gray-900 transition-colors">Terms & Conditions</Link>
           <Link to="/privacy" target="_blank" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
           <Link to="/cookies" target="_blank" className="hover:text-gray-900 transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  );
};