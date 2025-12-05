
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
    <nav className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap mask-linear-fade">
      <Link to="/" className={`${location.pathname === '/' ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'hover:text-gray-900 dark:hover:text-gray-200'} transition-colors flex-shrink-0`}>
        Home
      </Link>
      
      {pathnames.length > 0 && (
        <>
           {pathnames.map((value, index) => {
             const to = `/${pathnames.slice(0, index + 1).join('/')}`;
             const isLast = index === pathnames.length - 1;
             
             let displayName = routeNameMap[value];
             
             if (!displayName) {
                if (isLast && pageTitle) {
                    displayName = pageTitle;
                } else {
                    const isLikelyId = value.length > 20 || (value.length > 10 && /\d/.test(value));
                    
                    if (isLikelyId) {
                        displayName = 'Detail';
                    } else {
                        displayName = value
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, (char) => char.toUpperCase());
                    }
                }
             }

             const isNotLinkable = nonLinkableRoutes.includes(value);

             return (
               <React.Fragment key={to}>
                 <ChevronRight size={14} className={`mx-2 flex-shrink-0 text-gray-400 dark:text-gray-600 ${!isLast ? 'hidden sm:block' : ''}`} />
                 {isLast || isNotLinkable ? (
                   <span className={`${isLast ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400 hidden sm:inline'} truncate max-w-[150px] sm:max-w-[300px]`}>
                     {displayName}
                   </span>
                 ) : (
                   <Link to={to} className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex-shrink-0 hidden sm:inline">
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