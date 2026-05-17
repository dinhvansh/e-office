# Feature: Enhanced Internal Signing Page

**Date:** 2025-11-28  
**Status:** ✅ Completed

## Overview

Cập nhật màn hình ký internal để hiển thị đầy đủ thông tin phê duyệt, danh sách người ký và PDF viewer.

## Changes

### Backend

#### 1. Updated Sign Request Repository
**File:** `backend/src/modules/signRequests/signRequests.repository.ts`

Thêm approvals vào query khi lấy sign request:

```typescript
findById(id: number, tenantId: number) {
  return prisma.sign_requests.findFirst({
    where: { id, tenant_id: tenantId },
    include: { 
      signers: {
        orderBy: { signing_order: 'asc' }
      }, 
      document: {
        include: {
          approvals: {
            include: {
              approver: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  avatar_url: true
                }
              }
            },
            orderBy: { created_at: 'asc' }
          }
        }
      }
    },
  });
}
```

### Frontend

#### 1. New Component: ApprovalHistory
**File:** `frontend/components/signing/ApprovalHistory.tsx`

Component hiển thị lịch sử phê duyệt với:
- Avatar/icon người phê duyệt
- Trạng thái (Đã duyệt/Từ chối/Chờ duyệt)
- Comments
- Thời gian phê duyệt

#### 2. Updated Internal Signing Page
**File:** `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx`

**Layout mới:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Quay lại                                             │
│  Ký tài liệu                                            │
├──────────────────┬──────────────────────────────────────┤
│ LEFT COLUMN      │ RIGHT COLUMN                         │
│ (1/3 width)      │ (2/3 width)                          │
│                  │                                      │
│ 📋 Thông tin     │ 📄 PDF Viewer                        │
│    tài liệu      │    (700px height)                    │
│                  │                                      │
│ ✅ Lịch sử       │                                      │
│    phê duyệt     │                                      │
│    - Người duyệt │                                      │
│    - Comments    │                                      │
│    - Thời gian   │                                      │
│                  │                                      │
│ ✍️ Danh sách     │ ✍️ Chữ ký của bạn                    │
│    người ký      │    - Canvas vẽ chữ ký                │
│    - Thứ tự      │    - Xóa / Lưu                       │
│    - Trạng thái  │    - Preview                         │
│                  │    - Hoàn tất ký / Hủy               │
└──────────────────┴──────────────────────────────────────┘
```

**Features:**
- ✅ PDF viewer với iframe (sử dụng `/documents/:id/view` endpoint)
- ✅ Thông tin tài liệu (mã số, trạng thái, số người ký, loại ký)
- ✅ Lịch sử phê duyệt với comments
- ✅ Danh sách người ký với trạng thái
- ✅ Signature canvas
- ✅ Responsive layout (3 columns on desktop, stacked on mobile)

## API Endpoints Used

### GET /api/v1/sign-requests/:id
Returns sign request with:
- Document info
- Approvals (with approver details and comments)
- Signers (ordered by signing_order)

### GET /api/v1/documents/:id/view
Returns PDF file for inline viewing in iframe

### POST /api/v1/sign-requests/:id/sign-internal
Submit internal signature

## UI Components

### ApprovalHistory Component
```typescript
interface Approval {
  id: number;
  status: string;
  comments?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  approver: {
    id: number;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}
```

**Features:**
- Status icons (CheckCircle/XCircle/Clock)
- Status badges with colors
- Comments display with MessageSquare icon
- Date formatting with date-fns

### Signers List
- Numbered badges (1, 2, 3...)
- Name and email
- Status badges (Đã ký/Chờ ký)
- Ordered by signing_order

## Dependencies Added

```bash
npm install date-fns
```

## Testing

### Test Script
`backend/scripts/check-document-022.js` - Check document 022/2025 data

### Test URL
```
http://localhost:3000/sign-requests/:id/sign
```

## Files Changed

### Backend
- `backend/src/modules/signRequests/signRequests.repository.ts` - Added approvals to query

### Frontend
- `frontend/components/signing/ApprovalHistory.tsx` - New component
- `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx` - Updated layout
- `frontend/package.json` - Added date-fns

### Scripts
- `backend/scripts/check-document-022.js` - Test script
- `backend/scripts/test-internal-signing-page.js` - Test script
- `backend/scripts/create-test-document-with-approvals.js` - Create test data

## Benefits

1. **Better Context**: Người ký có thể xem được ai đã phê duyệt và comments của họ
2. **Transparency**: Hiển thị đầy đủ workflow từ phê duyệt đến ký
3. **Better UX**: Layout rõ ràng, dễ sử dụng
4. **PDF Viewing**: Xem trực tiếp PDF trước khi ký
5. **Progress Tracking**: Thấy được ai đã ký, ai chưa ký

## Related Features

- Approval workflow (Session 2025-11-27)
- Sequential signing (Session 2025-11-27)
- OTP expiry handling (Session 2025-11-28)
