# Task: Trang "Yêu cầu Ký số" (Sign Requests Management Page)

## 📋 Overview
Tạo trang quản lý yêu cầu ký số cho phép người dùng xem trạng thái luồng ký của các tài liệu họ đã tạo.

**Estimated Time**: 2-3 giờ

## 🎯 User Story
**Là** người tạo tài liệu cần ký  
**Tôi muốn** xem danh sách và trạng thái của các yêu cầu ký tôi đã tạo  
**Để** theo dõi tiến độ ký và quản lý các yêu cầu

## ✅ Acceptance Criteria

### 1. Backend API
- [ ] API endpoint: `GET /api/v1/sign-requests/my-requests`
- [ ] Trả về danh sách sign requests của user hiện tại (owner)
- [ ] Include: document info, signers, progress, status
- [ ] Filter by status (optional query param)
- [ ] Sort by created_at DESC

### 2. Frontend Page
- [ ] Route: `/sign-requests`
- [ ] Menu item: "Yêu cầu Ký số" với icon FileSignature
- [ ] Table với columns:
  - Mã yêu cầu (document_number hoặc ID)
  - Tên tài liệu
  - Người tạo (owner)
  - Ngày tạo
  - Tiến độ (progress bar + số: 3/3, 2/5...)
  - Trạng thái (badge: Đã hoàn thành, Chờ ký, Đã từ chối)
  - Hành động (xem chi tiết)

### 3. Features
- [ ] Filter tabs: Tất cả, Chờ ký, Đã hoàn thành, Đã từ chối
- [ ] Search by document name
- [ ] Click row → Navigate to document detail
- [ ] Progress bar với màu:
  - Xanh: Hoàn thành (100%)
  - Vàng: Đang ký (1-99%)
  - Xám: Chưa bắt đầu (0%)
- [ ] Status badges:
  - Xanh: "Đã hoàn thành"
  - Vàng: "Chờ ký"
  - Đỏ: "Đã từ chối"

## 🏗️ Implementation Plan

### Step 1: Backend API (30 phút)

#### 1.1 Update SignRequestsService
**File**: `backend/src/modules/signRequests/signRequests.service.ts`

```typescript
async getMySignRequests(userId: number, tenantId: number, status?: string) {
  const where: any = {
    tenant_id: tenantId,
    document: {
      owner_id: userId
    }
  };

  if (status) {
    where.status = status;
  }

  return prisma.sign_requests.findMany({
    where,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          original_file_name: true,
          document_number: true,
          owner: {
            select: { full_name: true, email: true }
          }
        }
      },
      signers: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          signed_at: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
}
```

#### 1.2 Update SignRequestsController
**File**: `backend/src/modules/signRequests/signRequests.controller.ts`

```typescript
getMyRequests = async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const signRequests = await signRequestsService.getMySignRequests(
    req.auth!.userId,
    req.auth!.tenantId,
    status
  );
  
  // Calculate progress for each request
  const requestsWithProgress = signRequests.map(sr => {
    const totalSigners = sr.signers.length;
    const signedCount = sr.signers.filter(s => s.status === 'signed').length;
    const rejectedCount = sr.signers.filter(s => s.status === 'rejected').length;
    
    return {
      ...sr,
      progress: {
        total: totalSigners,
        signed: signedCount,
        rejected: rejectedCount,
        pending: totalSigners - signedCount - rejectedCount,
        percentage: totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0
      }
    };
  });
  
  res.json(ok({ sign_requests: requestsWithProgress }));
};
```

#### 1.3 Update Routes
**File**: `backend/src/modules/signRequests/signRequests.routes.ts`

```typescript
router.get('/my-requests', authGuard, asyncHandler(controller.getMyRequests));
```

### Step 2: Frontend Page (1.5 giờ)

#### 2.1 Create Sign Requests Page
**File**: `frontend/app/(dashboard)/sign-requests/page.tsx`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { FileSignature, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

interface SignRequest {
  id: number;
  status: string;
  created_at: string;
  document: {
    id: number;
    title: string | null;
    original_file_name: string;
    document_number: string | null;
    owner: {
      full_name: string | null;
      email: string;
    };
  };
  progress: {
    total: number;
    signed: number;
    rejected: number;
    pending: number;
    percentage: number;
  };
}

export default function SignRequestsPage() {
  const { fetchJson } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-sign-requests', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetchJson<{ sign_requests: SignRequest[] }>(
        `/sign-requests/my-requests${params}`
      );
      return res.sign_requests;
    },
  });

  const getStatusBadge = (progress: SignRequest['progress']) => {
    if (progress.rejected > 0) {
      return <Badge variant="destructive">Đã từ chối</Badge>;
    }
    if (progress.percentage === 100) {
      return <Badge className="bg-green-500">Đã hoàn thành</Badge>;
    }
    return <Badge className="bg-yellow-500">Chờ ký</Badge>;
  };

  const getProgressColor = (percentage: number, rejected: number) => {
    if (rejected > 0) return 'bg-red-500';
    if (percentage === 100) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSignature}
        title="Yêu cầu Ký số"
        description="Theo dõi, quản lý và tạo mới các yêu cầu ký số"
        iconColor="text-blue-600"
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="pending">Chờ ký</TabsTrigger>
          <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
          <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Mã yêu cầu</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tên tài liệu</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Người tạo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Ngày tạo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tiến độ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">
                            {request.document.document_number || `#${request.id}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            {request.document.title || request.document.original_file_name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {request.document.owner.full_name || request.document.owner.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {dayjs(request.created_at).format('DD/MM/YYYY')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressColor(
                                  request.progress.percentage,
                                  request.progress.rejected
                                )}`}
                                style={{ width: `${request.progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium min-w-[50px]">
                              {request.progress.signed}/{request.progress.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(request.progress)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/documents/${request.document.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 2.2 Update Sidebar Menu
**File**: `frontend/constants/sidebarItems.ts`

```typescript
{
  label: 'Yêu cầu Ký số',
  href: '/sign-requests',
  icon: FileSignature,
  iconColor: 'text-blue-600',
  requiredRoles: ['Admin', 'Manager', 'User']
}
```

### Step 3: Testing (30 phút)

#### 3.1 Backend Test Script
**File**: `backend/scripts/test-my-sign-requests.js`

```javascript
const axios = require('axios');

async function testMySignRequests() {
  const API_BASE = 'http://localhost:4000/api/v1';
  
  // Login
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@acme.local',
    password: 'password123'
  });
  
  const token = loginRes.data.data.tokens.accessToken;
  
  // Get my sign requests
  const res = await axios.get(`${API_BASE}/sign-requests/my-requests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Sign Requests:', res.data.data.sign_requests.length);
  console.log('First request:', JSON.stringify(res.data.data.sign_requests[0], null, 2));
}

testMySignRequests();
```

#### 3.2 Manual Testing Checklist
- [ ] Login as user who created documents
- [ ] Navigate to "Yêu cầu Ký số"
- [ ] Verify table shows correct data
- [ ] Test filter tabs (Tất cả, Chờ ký, Đã hoàn thành)
- [ ] Verify progress bar displays correctly
- [ ] Verify status badges show correct colors
- [ ] Click "Xem" button → Navigate to document detail
- [ ] Test with different users (should only see their own requests)

## 📊 Data Structure

### API Response
```typescript
{
  sign_requests: [
    {
      id: 1,
      status: "pending",
      created_at: "2025-11-24T10:00:00Z",
      document: {
        id: 1,
        title: "Hợp đồng lao động",
        original_file_name: "contract.pdf",
        document_number: "HD-2024-001",
        owner: {
          full_name: "Nguyễn Văn A",
          email: "nva@company.com"
        }
      },
      progress: {
        total: 3,
        signed: 2,
        rejected: 0,
        pending: 1,
        percentage: 67
      }
    }
  ]
}
```

## 🎨 UI Design Notes

### Colors
- **Progress Bar**:
  - Green (#10b981): 100% complete
  - Yellow (#eab308): 1-99% complete
  - Red (#ef4444): Has rejections
  - Gray (#e5e7eb): Background

### Status Badges
- **Đã hoàn thành**: Green background
- **Chờ ký**: Yellow background
- **Đã từ chối**: Red background

### Layout
- Full-width table
- Sticky header
- Hover effect on rows
- Responsive (scroll on mobile)

## 🔗 Related Files
- Backend: `backend/src/modules/signRequests/`
- Frontend: `frontend/app/(dashboard)/sign-requests/`
- Components: `frontend/components/ui/`

## 📝 Notes
- Chỉ hiển thị sign requests của user hiện tại (owner)
- Progress tính theo số signers đã ký / tổng số signers
- Status "rejected" nếu có ít nhất 1 signer reject
- Click row hoặc button "Xem" → Navigate to document detail page

## ✅ Definition of Done
- [ ] Backend API hoạt động đúng
- [ ] Frontend page hiển thị đầy đủ thông tin
- [ ] Filter tabs hoạt động
- [ ] Progress bar hiển thị chính xác
- [ ] Status badges đúng màu
- [ ] Navigation hoạt động
- [ ] Responsive trên mobile
- [ ] No TypeScript errors
- [ ] Test script passed
- [ ] Manual testing completed

---

**Created**: 2025-11-24  
**Estimated Time**: 2-3 giờ  
**Priority**: High  
**Status**: Ready to implement
