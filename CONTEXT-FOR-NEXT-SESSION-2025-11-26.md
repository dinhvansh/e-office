# 🔄 Context for Next Session - 2025-11-26

## 📋 Current Status

### ✅ Completed Today (70%)

**Internal vs External Signing Implementation**:
1. ✅ Backend logic fix - Auto-detect internal users
2. ✅ Backend API - `/sign-requests/:id/sign-internal` endpoint
3. ✅ Frontend page - Internal signing page created
4. ✅ Testing - Backend API 100% working
5. ✅ Document 001/2025 fixed - Signers marked as internal

### ⏳ Pending (30%)

**Phase 3: UI Integration** (1 hour)
- [ ] Update Sign Requests list page
- [ ] Add "Ký ngay" button for internal signers
- [ ] Hide OTP/link buttons for internal signers
- [ ] Show different actions based on signer type

**Phase 4: Approval Integration** (1 hour)
- [ ] When approve, check if user is also signer
- [ ] Add checkbox: "Ký luôn khi approve"
- [ ] Auto-sign if checked
- [ ] Pass signature from approval to signer

**Phase 5: Complete Testing** (30 mins)
- [ ] Test complete internal signing flow
- [ ] Test mixed internal + external signers
- [ ] Test sequential signing order
- [ ] Verify progress updates correctly

---

## 🎯 Quick Start for Next Session

### Test Current Implementation

```bash
# 1. Backend test (should pass)
cd backend
node scripts/test-internal-signing.js

# Expected: ✅ Admin signed, progress 1/2 (50%)
```

### Continue Implementation

**Step 1: Update Sign Requests List** (30 mins)
- File: `frontend/app/(dashboard)/sign-requests/page.tsx`
- Add logic to detect if current user is internal signer
- Show "Ký ngay" button → Navigate to `/sign-requests/:id/sign`
- Hide OTP/link buttons for internal signers

**Step 2: Test Frontend** (15 mins)
- Login as approver@acme.local
- Go to Sign Requests page
- Should see "Ký ngay" button for document 001/2025
- Click → Open internal signing page
- Sign → Progress should update to 2/2 (100%)

**Step 3: Approval Integration** (1 hour)
- File: `frontend/app/(dashboard)/approvals/[id]/page.tsx`
- Add checkbox: "Tôi cũng là người ký, ký luôn khi approve"
- If checked, require signature
- Submit both approval + signature
- Backend: Auto-sign for approver if they are also signer

---

## 📊 Test Data

### Document 001/2025 (ID: 101)
- **Sign Request ID**: 53
- **Status**: pending (in_progress after admin signed)
- **Workflow**: Completed (2/2 approved)
- **Signers**:
  - Admin (ID: 64): ✅ Signed (1/2)
  - Approver (ID: 65): ⏳ Pending (need to sign)

### Test Credentials
```
Admin: admin@acme.local / password123
Approver: approver@acme.local / password123
```

### Test URLs
```
Sign Requests List: http://localhost:3000/sign-requests
Internal Signing: http://localhost:3000/sign-requests/53/sign
Approvals: http://localhost:3000/approvals
```

---

## 🔧 Key Implementation Details

### Backend API

**Endpoint**: `POST /api/v1/sign-requests/:id/sign-internal`

**Request**:
```json
{
  "signature_data": "data:image/png;base64,...",
  "signature_type": "drawn"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ký thành công!",
  "all_signed": false,
  "signer_id": 64
}
```

**Logic**:
1. Find signer for current user (is_internal: true)
2. Check signing order (sequential)
3. Update signer status → 'signed'
4. Check if all signed → Update sign request status
5. Return success message

### Frontend Page

**Location**: `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx`

**Features**:
- Document info display
- Signature canvas (react-signature-canvas)
- Save & preview signature
- Submit button
- Success redirect to `/sign-requests`

**Flow**:
```
1. User opens /sign-requests/53/sign
2. See document info
3. Draw signature on canvas
4. Click "Lưu chữ ký"
5. Preview signature
6. Click "Hoàn tất ký"
7. API call → Success
8. Redirect to /sign-requests
9. Progress updated: 1/2 → 2/2
```

---

## 📝 Important Notes

### Signer Detection Logic

**Backend** (`signRequests.service.ts`):
```typescript
// Check if email exists in users table
const internalUsers = await prisma.users.findMany({
  where: {
    tenant_id: tenantId,
    email: { in: signerEmails },
    status: 'active'
  }
});

// Set is_internal flag
is_internal: internalEmails.has(signer.email)
```

**Frontend** (TODO):
```typescript
// Check if current user is internal signer
const currentUserEmail = user.email;
const isInternalSigner = request.signers.some(s => 
  s.email === currentUserEmail && s.is_internal
);

// Show appropriate button
{isInternalSigner && s.status !== 'signed' && (
  <Button onClick={() => router.push(`/sign-requests/${request.id}/sign`)}>
    ✍️ Ký ngay
  </Button>
)}
```

### Progress Calculation

**Fixed in controller**:
```typescript
const signedCount = sr.signers.filter(s => 
  s.status === 'signed' || s.status === 'completed'
).length;
```

Now correctly counts both 'signed' and 'completed' statuses.

---

## 🚀 Next Steps Priority

1. **High**: UI Integration (Sign Requests list)
2. **Medium**: Approval Integration (Sign when approve)
3. **Low**: Additional features (batch signing, etc.)

---

## 📚 Reference Files

**Backend**:
- `backend/src/modules/signRequests/signRequests.service.ts` - Main logic
- `backend/src/modules/signRequests/signRequests.controller.ts` - API endpoint
- `backend/scripts/test-internal-signing.js` - Test script

**Frontend**:
- `frontend/app/(dashboard)/sign-requests/[id]/sign/page.tsx` - Signing page
- `frontend/app/(dashboard)/sign-requests/page.tsx` - List page (TODO)
- `frontend/app/(dashboard)/approvals/[id]/page.tsx` - Approval page (TODO)

**Documentation**:
- `SPEC-INTERNAL-EXTERNAL-SIGNING.md` - Full specification
- `PLAN-INTERNAL-EXTERNAL-SIGNING-FIX.md` - Implementation plan
- `agents.md` - Session logs

---

## ⚠️ Known Issues

None currently. Backend working 100%, frontend page created but not integrated yet.

---

## 🎯 Success Criteria

**Phase 3 Complete When**:
- ✅ Internal signers see "Ký ngay" button
- ✅ External signers see "Copy link" + "Gửi email" buttons
- ✅ Clicking "Ký ngay" opens internal signing page
- ✅ After signing, progress updates correctly

**Phase 4 Complete When**:
- ✅ Approvers can sign when approving
- ✅ Checkbox "Ký luôn khi approve" works
- ✅ Signature saved to both approval + signer
- ✅ Progress updates after approval+sign

**Full Feature Complete When**:
- ✅ All phases done
- ✅ End-to-end testing passed
- ✅ Mixed internal+external tested
- ✅ Sequential signing verified
- ✅ Document 001/2025 fully signed (2/2)

---

**Estimated Time Remaining**: 2.5 hours  
**Current Progress**: 70% complete  
**Status**: ✅ Backend working, Frontend pending integration
