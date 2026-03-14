import { useQuery, keepPreviousData } from '@tanstack/react-query'
import React, { useState } from 'react'

import { Table } from '@lenserfight/ui/components'
import { adminService } from '@lenserfight/data/repositories'
import { AdminListResponse } from '@lenserfight/types'
import { ContactMessage } from '@lenserfight/types'

export const AdminContacts: React.FC = () => {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<AdminListResponse<ContactMessage>>({
    queryKey: ['admin', 'contacts', page],
    queryFn: () => adminService.getContacts(page, 15),
    placeholderData: keepPreviousData,
  })

  const columns = [
    { header: 'Name', accessor: 'name' as const, className: 'font-medium' },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Subject', accessor: 'subject' as const },
    { header: 'Message', accessor: 'message' as const, className: 'truncate max-w-xs' },
    { header: 'Date', render: (c: any) => new Date(c.created_at).toLocaleDateString() },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Contact Messages</h1>

      <Table
        columns={columns}
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalPages: Math.ceil((data?.total || 0) / 15),
          onPageChange: setPage,
        }}
        emptyState={<div className="p-8 text-center text-gray-500">No messages found.</div>}
      />
    </div>
  )
}
