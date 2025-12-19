import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'

import { Avatar } from '../../../components/Avatar'
import { Table } from '../../../components/Table'
import { adminService } from '../../../services/adminService'

export const AdminWaitlist: React.FC = () => {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'waitlist', page],
    queryFn: () => adminService.getWaitlist(page, 20),
    keepPreviousData: true,
  })

  const columns = [
    {
      header: 'User',
      render: (u: any) => (
        <div className="flex items-center gap-2">
          <Avatar src={u.avatar_url} size="sm" /> <span>{u.display_name}</span>
        </div>
      ),
    },
    { header: 'Handle', accessor: 'handle' as const },
    { header: 'Joined Date', render: (u: any) => new Date(u.created_at).toLocaleDateString() },
    {
      header: 'Status',
      render: () => <span className="text-green-600 font-bold text-xs">WAITING</span>,
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Waitlist</h1>
      <p className="text-gray-500 mb-6">Users who have opted into the beta program.</p>

      <Table
        columns={columns}
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((data?.total || 0) / 20),
          onPageChange: setPage,
        }}
        emptyState={<div className="p-8 text-center text-gray-500">Waitlist is empty.</div>}
      />
    </div>
  )
}
