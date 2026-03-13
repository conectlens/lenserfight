import { useQuery, keepPreviousData } from '@tanstack/react-query'
import React, { useState } from 'react'

import { Table } from '../../../components/Table'
import { adminService } from '../../../services/adminService'
import { AdminListResponse, AdminUser } from '../../../types/admin.types'
import { InputField } from '../../auth/components/InputField'

export const AdminUsers: React.FC = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<AdminListResponse<AdminUser>>({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminService.getUsers(page, 20, search),
    placeholderData: keepPreviousData,
  })

  const columns = [
    { header: 'ID', accessor: 'id' as const, className: 'w-24 text-xs font-mono' },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Display Name', accessor: 'display_name' as const },
    {
      header: 'Role',
      render: (u: any) =>
        u.is_super_admin ? (
          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">Admin</span>
        ) : (
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">User</span>
        ),
    },
    { header: 'Joined', render: (u: any) => new Date(u.created_at).toLocaleDateString() },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <div className="mb-6 w-full max-w-md">
        <InputField
          label=""
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
        emptyState={<div className="p-8 text-center text-gray-500">No users found.</div>}
      />
    </div>
  )
}
