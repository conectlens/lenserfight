import { Users, FileText, Zap, Clock, Activity, ShieldCheck } from 'lucide-react'
import React from 'react'

import { Card } from '../../../components/Card'

export const AdminWelcome: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, Super Admin
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of the LenserFight ecosystem health.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow dark:bg-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">1,240</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow dark:bg-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Threads</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">85</h3>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <FileText className="text-green-500" size={24} />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow dark:bg-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Prompt Battles</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">320</h3>
            </div>
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Zap className="text-yellow-500" size={24} />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow dark:bg-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Waitlist</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">450</h3>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="text-purple-500" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 h-64 flex flex-col justify-center items-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <Activity size={32} className="mb-3 opacity-50" />
          <span className="font-medium text-sm">System Health: 100%</span>
          <p className="text-xs mt-1 opacity-70">No critical alerts.</p>
        </Card>
        <Card className="p-8 h-64 flex flex-col justify-center items-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <ShieldCheck size={32} className="mb-3 opacity-50" />
          <span className="font-medium text-sm">Audit Logs</span>
          <p className="text-xs mt-1 opacity-70">Security monitoring active.</p>
        </Card>
      </div>
    </div>
  )
}
