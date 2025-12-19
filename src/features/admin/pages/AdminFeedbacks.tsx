import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'

import { Table } from '../../../components/Table'
import { adminService } from '../../../services/adminService'

export const AdminFeedbacks: React.FC = () => {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feedbacks', page, filter],
    queryFn: () => adminService.getFeedbacks(page, 15, filter),
    keepPreviousData: true,
  })

  const columns = [
    {
      header: 'Tag',
      render: (f: any) => (
        <span className="uppercase text-xs font-bold tracking-wider">{f.product_tag}</span>
      ),
    },
    { header: 'Page', accessor: 'page' as const, className: 'text-gray-500 text-xs' },
    { header: 'Message', accessor: 'message' as const, className: 'max-w-md truncate' },
    {
      header: 'Status',
      render: (f: any) => (
        <span
          className={`px-2 py-1 rounded text-xs ${f.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
        >
          {f.status}
        </span>
      ),
    },
    { header: 'Date', render: (f: any) => new Date(f.created_at).toLocaleDateString() },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Feedback</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option
            value="all"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
          >
            All Status
          </option>
          <option
            value="pending"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
          >
            Pending
          </option>
          <option
            value="resolved"
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
          >
            Resolved
          </option>
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.data || []}
        keyExtractor={(item) => item.id || Math.random().toString()}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((data?.total || 0) / 15),
          onPageChange: setPage,
        }}
        emptyState={
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No feedback entries found.
          </div>
        }
      />
    </div>
  )
}
