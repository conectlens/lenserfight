
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useUI } from '../context/UIContext';

const routeNameMap: Record<string, string> = {
  prompts: 'Prompts',
  threads: 'Threads',
  lenser: 'Lenser',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  settings: 'Settings',
  notifications: 'Notifications'
};

const nonLinkableRoutes = ['lenser', 'threads'];

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { pageTitle } = useUI();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center text-sm font-medium text-gray-500 overflow-hidden whitespace-nowrap mask-linear-fade">
      <Link to="/" className={`${location.pathname === '/' ? 'text-gray-900 font-semibold' : 'hover:text-gray-900'} transition-colors flex-shrink-0`}>
        Home
      </Link>
      
      {pathnames.length > 0 && (
        <>
           {pathnames.map((value, index) => {
             const to = `/${pathnames.slice(0, index + 1).join('/')}`;
             const isLast = index === pathnames.length - 1;
             
             // Simple formatting: generic mapping or capitalize
             let displayName = routeNameMap[value];
             
             if (!displayName) {
                // Check if this is the active page and we have a specific title override
                if (isLast && pageTitle) {
                    displayName = pageTitle;
                } else {
                    // Heuristic for IDs: if it contains numbers/dashes and is long, treat as "Detail" or truncate
                    if (value.length > 15 || /\d/.test(value)) {
                        displayName = 'Detail';
                    } else {
                        displayName = value.charAt(0).toUpperCase() + value.slice(1);
                    }
                }
             }

             // Check if this segment should not be clickable (intermediate paths with no index page)
             const isNotLinkable = nonLinkableRoutes.includes(value);

             return (
               <React.Fragment key={to}>
                 <ChevronRight size={14} className="mx-2 flex-shrink-0 text-gray-400" />
                 {isLast || isNotLinkable ? (
                   <span className={`${isLast ? 'text-gray-900 font-semibold' : 'text-gray-500'} truncate max-w-[150px] sm:max-w-[300px]`}>
                     {displayName}
                   </span>
                 ) : (
                   <Link to={to} className="hover:text-gray-900 transition-colors flex-shrink-0">
                     {displayName}
                   </Link>
                 )}
               </React.Fragment>
             );
           })}
        </>
      )}
    </nav>
  );
};
