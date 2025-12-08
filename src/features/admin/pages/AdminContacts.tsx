
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { Table } from '../../../components/Table';

export const AdminContacts: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contacts', page],
    queryFn: () => adminService.getContacts(page, 15),
    keepPreviousData: true
  });

  const columns = [
    { header: 'Name', accessor: 'name' as const, className: 'font-medium' },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Subject', accessor: 'subject' as const },
    { header: 'Message', accessor: 'message' as const, className: 'truncate max-w-xs' },
    { header: 'Date', render: (c: any) => new Date(c.created_at).toLocaleDateString() },
  ];

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
            onPageChange: setPage
        }}
        emptyState={<div className="p-8 text-center text-gray-500">No messages found.</div>}
      />
    </div>
  );
};
