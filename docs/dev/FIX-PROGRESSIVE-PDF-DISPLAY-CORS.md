# Fix: Progressive PDF Display - CORS Error

**Date**: 2025-11-30  
**Status**: ✅ RESOLVED

## Problem

Trang document flow (`/documents/:id/flow`) không hiển thị progressive PDF sau khi có người ký. Browser console hiển thị lỗi CORS:

```
Access to fetch at 'http://localhost:4000/api/v1/documents/82/view-signed?t=...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Request header field cache-control is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

## Root Cause

**CORS Preflight Rejection**: Frontend gửi custom headers (`Cache-Control`, `Pragma`, `Expires`) trong fetch request, trigger CORS preflight check. Backend CORS config chỉ cho phép `Content-Type` và `Authorization`, không cho phép các cache-control headers.

### Technical Details

1. **SimplePDFViewer** gửi request với headers:
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Cache-Control': 'no-cache, no-store, must-revalidate',
     'Pragma': 'no-cache',
     'Expires': '0'
   }
   ```

2. **Backend CORS config** (`backend/src/app.ts`):
   ```typescript
   cors({
     allowedHeaders: ['Content-Type', 'Authorization'], // ❌ Missing cache headers
   })
   ```

3. Browser gửi **OPTIONS preflight request** để check xem server có cho phép các headers này không
4. Server reject vì `Cache-Control`, `Pragma`, `Expires` không nằm trong `allowedHeaders`
5. Browser block actual GET request

## Solution

### Option 1: Add Headers to CORS Config (Recommended)

**File**: `backend/src/app.ts`

```typescript
cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',  // ✅ Add
    'Pragma',         // ✅ Add
    'Expires'         // ✅ Add
  ],
})
```

### Option 2: Remove Unnecessary Headers from Frontend

**File**: `frontend/components/pdf/SimplePDFViewer.tsx`

```typescript
// Before
const response = await fetch(pdfUrl, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate', // ❌ Causes CORS issue
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// After
const response = await fetch(pdfUrl, {
  headers: {
    'Authorization': `Bearer ${token}` // ✅ Only essential header
  }
});
```

**Note**: Backend đã set cache-control headers trong response (`viewSigned` controller), nên không cần gửi từ client.

## Implementation

Áp dụng **cả 2 options** để đảm bảo:
1. Backend CORS config linh hoạt hơn (cho phép cache headers nếu cần)
2. Frontend gọn gàng hơn (chỉ gửi headers cần thiết)

## Testing

```bash
# 1. Test API endpoint trả về signed_file_path
node backend/scripts/test-flow-endpoint-82.js

# 2. Test view-signed endpoint
node backend/scripts/test-view-signed-82.js

# 3. Test frontend
# - Mở http://localhost:3000/documents/82/flow
# - Hard refresh (Ctrl+Shift+R)
# - Check browser console - không còn CORS error
# - PDF với chữ ký hiển thị đúng
```

## Related Changes

### Backend: documentFlow.service.ts

Thêm `signed_file_path` vào response để frontend biết khi nào có file mới:

```typescript
return {
  document: {
    id: document.id,
    title: document.title,
    document_number: document.document_number,
    status: overallStatus,
    document_type: document.document_type?.name,
    created_at: document.created_at.toISOString(),
    signed_file_path: document.signed_file_path, // ✅ Add this
    owner: { ... },
  },
  phases,
  steps,
  activities,
  can_approve: this.canUserApprove(document, userId),
  can_sign: this.canUserSign(document, userId),
};
```

### Frontend: flow/page.tsx

Logic đã đúng - tự động detect `signed_file_path` và switch endpoint:

```typescript
useEffect(() => {
  if (typeof window !== 'undefined' && documentId && flowData) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    
    const hasSignedFile = flowData?.document?.signed_file_path;
    const endpoint = hasSignedFile ? 'view-signed' : 'view'; // ✅ Auto switch
    
    const timestamp = Date.now();
    const cacheBuster = hasSignedFile ? `?t=${timestamp}` : '';
    
    setPdfUrl(`${apiUrl}/documents/${documentId}/${endpoint}${cacheBuster}`);
  }
}, [documentId, flowData?.document?.signed_file_path, flowData?.document?.status]);
```

## Key Learnings

1. **CORS Preflight**: Custom headers trigger OPTIONS preflight request
2. **allowedHeaders**: Phải list tất cả custom headers client gửi
3. **Cache Headers**: Nên set ở server response, không cần gửi từ client request
4. **Browser Cache**: Dùng query param `?t=timestamp` để bust cache
5. **Auto-refresh**: React Query `refetchInterval` giúp tự động cập nhật UI

## Prevention

- Khi thêm custom headers vào fetch request, nhớ update CORS config
- Prefer server-side cache control thay vì client-side
- Test với browser DevTools Network tab để catch CORS issues sớm
- Document CORS config rõ ràng trong code comments

## References

- MDN: [CORS Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- Express CORS: [Configuration Options](https://expressjs.com/en/resources/middleware/cors.html)
- Related: `docs/dev/FEATURE-PROGRESSIVE-PDF-GENERATION.md`
