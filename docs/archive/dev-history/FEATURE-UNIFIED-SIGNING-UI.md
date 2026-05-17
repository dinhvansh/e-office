# Feature: Unified Signing UI (Internal = External without OTP)

**Date:** 2025-11-28  
**Status:** ✅ Completed

## Overview

Sử dụng lại UI ký của external signing cho internal signing, bỏ phần xác thực OTP vì internal user đã đăng nhập.

## Rationale

### Why Unify?

1. **Better UX**: External signing UI đã có đầy đủ features:
   - PDF viewer với fields overlay
   - Guided signing mode
   - Field validation
   - Progress tracking
   - Responsive design

2. **Maintainability**: Chỉ maintain 1 UI thay vì 2

3. **Consistency**: User experience giống nhau cho cả internal và external

4. **Security**: Internal users đã authenticated qua login, không cần OTP

### Differences: Internal vs External

| Feature | External | Internal |
|---------|----------|----------|
| Authentication | OTP via email | Already logged in |
| PDF Viewer | ✅ | ✅ |
| Field-based signing | ✅ | ✅ |
| Guided mode | ✅ | ✅ |
| Approval history | ❌ | ✅ |
| Signers list | ✅ | ✅ (with order) |
| Activities | ✅ | ✅ |

## Implementation

### New Files

#### 1. Internal Signing Page
**File:** `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

- Reuses external signing UI components
- Fetches data from `/api/v1/sign-requests/:id` (authenticated)
- Finds current user's signer record
- Transforms data to match external signing interface
- Submits to `/api/v1/sign-requests/:id/sign-internal`
- No OTP required

#### 2. Internal Signing Sidebar
**File:** `frontend/components/signing/InternalSigningSidebar.tsx`

Features:
- Progress bar (signed/total)
- Approval history (with ApprovalHistory component)
- Signers list (with order badges)
- Activity history
- Highlights current user

### Updated Files

#### 1. Old Internal Signing Page
**File:** `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx`

Now redirects to `/sign-v2`:
```typescript
useEffect(() => {
  router.replace(`/sign-requests/${signRequestId}/sign-v2`);
}, [signRequestId, router]);
```

## Components Reused

### From External Signing

1. **PDFSigningViewer** - PDF viewer with fields overlay
2. **SignatureModal** - Signature creation modal
3. **ProgressHeader** - Document title and progress
4. **ConfirmationDialog** - Confirm before submit
5. **ThankYouPage** - Success page after signing

### New Components

1. **InternalSigningSidebar** - Sidebar with approvals, signers, activities
2. **ApprovalHistory** - Approval history with comments (reused from previous feature)

## User Flow

### Internal Signing Flow

```
1. User clicks "Ký" button on sign request
   ↓
2. Redirected to /sign-requests/:id/internal-sign
   ↓
3. Page loads:
   - Fetch sign request data (with approvals)
   - Find current user's signer record
   - Transform data to match external format
   ↓
4. UI shows:
   - Left: Approvals, Signers list, Activities
   - Right: PDF viewer with fields
   ↓
5. User can:
   - View PDF
   - Click "Bắt đầu ký theo hướng dẫn" for guided mode
   - Or manually click fields to sign
   ↓
6. After completing all fields:
   - Click "Hoàn tất ký"
   - Submit to /sign-internal endpoint
   - No OTP required
   ↓
7. Success:
   - Show ThankYouPage
   - Can download signed PDF
```

## API Endpoints

### GET /api/v1/sign-requests/:id
**Used by:** Internal signing page

**Returns:**
```json
{
  "sign_request": {
    "id": 1,
    "title": "...",
    "document": {
      "id": 1,
      "title": "...",
      "approvals": [
        {
          "id": 1,
          "status": "approved",
          "comments": "...",
          "approver": { ... }
        }
      ]
    },
    "signers": [
      {
        "id": 1,
        "user_id": 1,
        "name": "...",
        "email": "...",
        "status": "pending",
        "signing_order": 1
      }
    ]
  }
}
```

### POST /api/v1/sign-requests/:id/sign-internal
**Used by:** Internal signing submission

**Body:**
```json
{
  "signature_data": "data:image/png;base64,...",
  "signature_type": "drawn",
  "field_values": [
    { "field_id": 1, "value": "..." }
  ]
}
```

**No OTP required** - User is already authenticated

## Benefits

### For Users
- ✅ Consistent experience (internal = external)
- ✅ Better UI with guided mode
- ✅ See approvals and comments before signing
- ✅ No OTP hassle for internal users

### For Developers
- ✅ Single UI to maintain
- ✅ Reuse existing components
- ✅ Less code duplication
- ✅ Easier to add new features

## Migration Path

### Old Page → New Page

Old URL: `/sign-requests/:id/sign`
New URL: `/sign-requests/:id/internal-sign`

Old page now redirects to new page automatically.

### Rollback Plan

If issues occur, simply remove the redirect in old page:
```typescript
// Remove this:
useEffect(() => {
  router.replace(`/sign-requests/${signRequestId}/internal-sign`);
}, [signRequestId, router]);
```

## Testing

### Test Scenarios

1. ✅ Internal user can sign without OTP
2. ✅ PDF viewer loads correctly
3. ✅ Fields overlay on PDF
4. ✅ Guided mode works
5. ✅ Approval history shows
6. ✅ Signers list shows with order
7. ✅ Submit works without OTP
8. ✅ Thank you page shows after signing

### Test URL
```
http://localhost:3000/sign-requests/:id/sign
→ Redirects to /internal-sign
```

## Files Changed

### New Files
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`
- `frontend/components/signing/InternalSigningSidebar.tsx`

### Updated Files
- `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx` - Added redirect

### Reused Components
- `frontend/components/pdf/PDFSigningViewer.tsx`
- `frontend/components/signature/SignatureModal.tsx`
- `frontend/components/signing/ProgressHeader.tsx`
- `frontend/components/signing/ConfirmationDialog.tsx`
- `frontend/components/signing/ThankYouPage.tsx`
- `frontend/components/signing/ApprovalHistory.tsx`

## Related Features

- External signing with OTP (Session 2025-11-27)
- Approval workflow (Session 2025-11-27)
- Field-based signing (Session 2025-11-22)
- Guided signing mode (Session 2025-11-22)
- Internal signing page enhanced (Session 2025-11-28)

## Future Enhancements

1. **Certificate signing**: Add digital certificate option for internal users
2. **Biometric signing**: Use fingerprint/face ID on mobile
3. **Batch signing**: Sign multiple documents at once
4. **Templates**: Save signature for reuse
5. **Comments**: Allow signers to add comments when signing
