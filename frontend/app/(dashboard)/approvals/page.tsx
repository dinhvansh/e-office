'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckSquare, FileText, Clock, User, ArrowRight, History, Filter } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ApprovalItem {
  id: number;
  document_id: number;
  due_date: string;
  created_at: string;
  document: {
    id: number;
    title: string | null;
    document_number: string | null;
    original_file_name?: string | null;
    document_type: {
      name: string;
      code: string;
    };
    owner: {
      full_name: string | null;
      email: string;
    } | null;
  };
  workflow: {
    name: string;
  };
  workflow_step: {
    step_name: string;
  };
}

export default function ApprovalsPage() {
  const { fetchJson } = useAuth();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['my-pending-approvals'],
    queryFn: async () => {
      const res = await fetchJson<{ approvals: ApprovalItem[] }>('/approvals/my-pending');
      return res.approvals;
    },
  });

  const getDueDateColor = (date: string) => {
    const now = dayjs();
    const due = dayjs(date);
    const diff = due.diff(now, 'day');

    if (diff < 0) return 'text-red-600 bg-red-50 border-red-200'; // Overdue
    if (diff <= 1) return 'text-orange-600 bg-orange-50 border-orange-200'; // Due soon
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CheckSquare}
        title="Phê duyệt của tôi"
        description="Quản lý các văn bản cần bạn phê duyệt"
        iconColor="text-amber-600"
        actions={
          <Badge variant="secondary" className="text-sm">
            {data?.length ?? 0} chờ xử lý
          </Badge>
        }
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="pending">Đang chờ duyệt</TabsTrigger>
          <TabsTrigger value="history">Lịch sử phê duyệt</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Danh sách chờ duyệt</CardTitle>
                  <CardDescription>
                    Các văn bản đang chờ bạn xử lý
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Lọc
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data && data.length > 0 ? (
                <div className="space-y-4">
                  {data.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-1">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base hover:underline cursor-pointer" onClick={() => router.push(`/documents/${item.document_id}`)}>
                              {item.document.original_file_name || item.document.title || `Document #${item.document_id}`}
                            </h3>
                            {item.document.document_number && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {item.document.document_number}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {item.document.document_type.name}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{item.document.owner?.full_name || item.document.owner?.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Bước:</span>
                              <span>{item.workflow_step.step_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Quy trình:</span>
                              <span>{item.workflow.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 min-w-[150px]">
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDueDateColor(item.due_date)}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Hạn: {dayjs(item.due_date).format('DD/MM/YYYY')}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full sm:w-auto"
                          onClick={() => router.push(`/documents/${item.document.id}`)}
                        >
                          Xử lý
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckSquare}
                  title="Không có văn bản chờ duyệt"
                  description="Tuyệt vời! Bạn đã hoàn thành tất cả các yêu cầu phê duyệt."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={History}
                title="Lịch sử phê duyệt"
                description="Tính năng đang được phát triển"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
