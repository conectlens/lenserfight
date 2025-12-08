
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <AdminSidebar />
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
            <Outlet />
        </div>
      </main>
    </div>
  );
};
