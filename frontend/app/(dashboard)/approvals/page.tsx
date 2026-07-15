'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AsyncStatus } from '@/components/ui/async-state';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
} from 'lucide-react';
import dayjs from 'dayjs';

interface Approval {
  id: number;
  action: string;
  created_at: string;
  document_id: number;
  document: {
    id: number;
    title: string;
    document_number: string;
    original_file_name: string;
    owner: {
      id: number;
      email: string;
      full_name: string;
    };
    document_type: {
      id: number;
      name: string;
      code: string;
    };
  };
  workflow_step: {
    id: number;
    step_name: string;
  };
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  info_requested: number;
}

interface ApiResponse {
  approvals: Approval[];
  statistics: Statistics;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ApprovalsPage() {
  const { fetchJson } = useAuth();
  const router = useRouter();

  // State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [creatorSearch, setCreatorSearch] = useState('');

  // Fetch approvals
  const { data, isLoading, isError, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['approvals', page, limit, search, status, documentTypeId, sortBy, sortOrder, creatorSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (documentTypeId) params.append('document_type_id', documentTypeId);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);
      if (creatorSearch) params.append('creator_search', creatorSearch);

      const response = await fetchJson<ApiResponse>(`/approvals/my-pending?${params.toString()}`);
      return response;
    },
  });

  // Fetch document types for filter
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const response = await fetchJson<any>('/document-types');
      return Array.isArray(response) ? response : [];
    },
  });

  const statistics = data?.statistics || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    info_requested: 0,
  };

  const approvals = data?.approvals || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phê duyệt của tôi"
        description="Quản lý các yêu cầu phê duyệt"
        icon={ClipboardList}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng số"
          value={statistics.total}
          icon={FileText}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <MetricCard
          title="Chờ duyệt"
          value={statistics.pending}
          icon={Clock}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
        <MetricCard
          title="Đã duyệt"
          value={statistics.approved}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <MetricCard
          title="Từ chối"
          value={statistics.rejected}
          icon={XCircle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Bộ lọc</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Tìm kiếm</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Mã, tên tài liệu..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={status || "all"}
              onValueChange={(value) => {
                setStatus(value === "all" ? "" : value);
                setPage(1);
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="info_requested">Yêu cầu bổ sung</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="docType">Loại văn bản</Label>
            <Select
              value={documentTypeId || "all"}
              onValueChange={(value) => {
                setDocumentTypeId(value === "all" ? "" : value);
                setPage(1);
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="docType">
                <SelectValue placeholder="Tất cả loại" />
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
          </div>

          {/* Creator Filter */}
          <div className="space-y-2">
            <Label htmlFor="creator">Người tạo</Label>
            <Input
              id="creator"
              placeholder="Tên hoặc email..."
              value={creatorSearch}
              onChange={(e) => {
                setCreatorSearch(e.target.value);
                setPage(1);
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="sort">Sắp xếp theo</Label>
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
                setPage(1);
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Mới nhất</SelectItem>
                <SelectItem value="created_at-asc">Cũ nhất</SelectItem>
                <SelectItem value="document_number-asc">Mã văn bản A-Z</SelectItem>
                <SelectItem value="document_number-desc">Mã văn bản Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm">
        <AsyncStatus message={isLoading ? 'Đang tải yêu cầu phê duyệt...' : isError ? 'Không thể tải yêu cầu phê duyệt.' : approvals.length === 0 ? 'Không có yêu cầu phê duyệt.' : `${approvals.length} yêu cầu phê duyệt đã tải.`} />
        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không thể tải yêu cầu phê duyệt</h3>
            <p className="text-gray-500 mb-4">Không thể tải yêu cầu phê duyệt. Vui lòng thử lại.</p>
            <Button onClick={() => void refetch()}>Thử lại</Button>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Không có yêu cầu phê duyệt
            </h3>
            <p className="text-gray-500">
              {search || status || documentTypeId || creatorSearch
                ? 'Không tìm thấy kết quả phù hợp với bộ lọc'
                : 'Bạn chưa có yêu cầu phê duyệt nào'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã yêu cầu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên tài liệu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người tạo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvals.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {item.document.document_number || `#${item.document_id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span 
                            className="text-sm font-medium text-gray-900 hover:underline cursor-pointer" 
                            onClick={() => router.push(`/approvals/${item.id}`)}
                          >
                            {item.document.original_file_name || item.document.title || `Document #${item.document_id}`}
                          </span>
                          <Badge variant="secondary" className="text-xs w-fit">
                            {item.document.document_type.name}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {item.document.owner?.full_name || item.document.owner?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{dayjs(item.created_at).format('DD/MM/YYYY')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge 
                          variant={
                            item.action === 'approved' ? 'default' :
                            item.action === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {item.workflow_step.step_name}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/approvals/${item.id}`)}
                        >
                          Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total}
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                  }}
                  disabled={isLoading}
                >
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
                  disabled={page === 1 || isLoading}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-700 px-2">
                  Trang {pagination.page} / {pagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages || isLoading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page >= pagination.totalPages || isLoading}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
