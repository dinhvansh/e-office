'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FileText, User, Clock, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Task {
  task_type: 'approval' | 'signing';
  task_id: number;
  sign_request_id?: number;
  document_id: number;
  document_number: string;
  document_title: string;
  document_type: { id: number; name: string; code: string };
  owner: { id: number; email: string; full_name: string };
  status: string;
  workflow_step?: string;
  signing_order?: number;
  created_at: string;
  due_date?: string;
}

export default function MyTasksPage() {
  const { fetchJson } = useAuth();
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState('');
  const [taskType, setTaskType] = useState('');
  const [status, setStatus] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch combined tasks
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-tasks', page, limit, search, taskType, status, documentTypeId, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (taskType) params.append('task_type', taskType);
      if (status) params.append('status', status);
      if (documentTypeId) params.append('document_type_id', documentTypeId);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      const response = await fetchJson<any>(`/approvals/my-tasks?${params.toString()}`);
      return response;
    },
    staleTime: 0,
  });

  // Fetch document types for filter
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const response = await fetchJson<any>('/document-types');
      return Array.isArray(response) ? response : [];
    },
  });

  const tasks = data?.tasks || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const statistics = data?.statistics || { total: 0, approval_pending: 0, signing_pending: 0, completed: 0 };

  const handleTaskClick = (task: Task) => {
    if (task.task_type === 'approval') {
      router.push(`/approvals/${task.task_id}`);
    } else {
      router.push(`/sign-requests/${task.sign_request_id}/sign`);
    }
  };

  const getStatusBadge = (task: Task) => {
    if (task.task_type === 'approval') {
      switch (task.status) {
        case 'pending': return <Badge className="bg-orange-500">Chờ duyệt</Badge>;
        case 'approved': return <Badge className="bg-green-500">Đã duyệt</Badge>;
        case 'rejected': return <Badge className="bg-red-500">Từ chối</Badge>;
        case 'info_requested': return <Badge className="bg-blue-500">Yêu cầu bổ sung</Badge>;
        default: return <Badge>{task.status}</Badge>;
      }
    } else {
      switch (task.status) {
        case 'pending':
        case 'otp_sent': return <Badge className="bg-orange-500">Chờ ký</Badge>;
        case 'signed': return <Badge className="bg-green-500">Đã ký</Badge>;
        case 'rejected': return <Badge className="bg-red-500">Từ chối</Badge>;
        default: return <Badge>{task.status}</Badge>;
      }
    }
  };

  const getActionButton = (task: Task) => {
    if (task.task_type === 'approval') {
      if (task.status === 'pending') {
        return (
          <Button
            size="sm"
            onClick={() => handleTaskClick(task)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Phê duyệt
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTaskClick(task)}
        >
          Xem
        </Button>
      );
    } else {
      if (task.status === 'pending' || task.status === 'otp_sent') {
        return (
          <Button
            size="sm"
            onClick={() => handleTaskClick(task)}
            className="bg-green-600 hover:bg-green-700"
          >
            <PenTool className="w-4 h-4 mr-1" />
            Ký ngay
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTaskClick(task)}
        >
          Xem
        </Button>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Công việc của tôi</h1>
        <p className="text-muted-foreground">Quản lý phê duyệt và ký tài liệu</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Tổng công việc</div>
          <div className="text-2xl font-bold">{statistics.total}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Chờ phê duyệt</div>
          <div className="text-2xl font-bold text-orange-600">{statistics.approval_pending}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Chờ ký</div>
          <div className="text-2xl font-bold text-blue-600">{statistics.signing_pending}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Đã hoàn thành</div>
          <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>

          {/* Task Type */}
          <Select value={taskType || 'all'} onValueChange={(value) => { setTaskType(value === 'all' ? '' : value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Loại công việc" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="approval">Phê duyệt</SelectItem>
              <SelectItem value="signing">Ký tài liệu</SelectItem>
            </SelectContent>
          </Select>

          {/* Document Type */}
          <Select value={documentTypeId || 'all'} onValueChange={(value) => { setDocumentTypeId(value === 'all' ? '' : value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Loại văn bản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {documentTypes?.map((type: any) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [newSortBy, newSortOrder] = value.split('-');
            setSortBy(newSortBy);
            setSortOrder(newSortOrder as 'asc' | 'desc');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Mới nhất</SelectItem>
              <SelectItem value="created_at-asc">Cũ nhất</SelectItem>
              <SelectItem value="document_number-asc">Số văn bản A-Z</SelectItem>
              <SelectItem value="document_number-desc">Số văn bản Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Không có công việc nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã văn bản</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên tài liệu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task: Task) => (
                  <tr key={`${task.task_type}-${task.task_id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {task.task_type === 'approval' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Phê duyệt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <PenTool className="w-3 h-3 mr-1" />
                          Ký
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{task.document_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium">{task.document_title || 'Untitled'}</div>
                        <div className="text-sm text-muted-foreground">{task.document_type?.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{task.owner?.full_name || task.owner?.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{new Date(task.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(task)}
                    </td>
                    <td className="px-4 py-4">
                      {getActionButton(task)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && tasks.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} trong tổng số {pagination.total}
              </span>
              <Select value={limit.toString()} onValueChange={(value) => { setLimit(parseInt(value)); setPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Trang {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pagination.totalPages)}
                disabled={page >= pagination.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
