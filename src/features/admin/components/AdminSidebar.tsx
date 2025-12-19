import {
  LayoutDashboard,
  BarChart2,
  Users,
  Palette,
  MessageSquare,
  Clock,
  Mail,
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../../../context/AuthContext'

const items = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/design', icon: Palette, label: 'Design System' },
  { path: '/admin/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
  { path: '/admin/waitlist', icon: Clock, label: 'Waitlist' },
  { path: '/admin/contacts', icon: Mail, label: 'Contacts' },
]

export const AdminSidebar: React.FC = () => {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <div className="w-64 bg-gray-900 dark:bg-black text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-50 border-r border-gray-800 dark:border-gray-800 transition-colors duration-200">
      <div className="p-6 border-b border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-red-900/20">
          A
        </div>
        <span className="font-bold text-lg tracking-tight">LF Admin</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-800 dark:bg-gray-900 text-white shadow-sm border border-gray-700 dark:border-gray-800'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} /> Back to App
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 w-full text-left transition-colors"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  )
}
