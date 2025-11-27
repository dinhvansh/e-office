# 🔧 Plan: Fix Internal vs External Signing

## 🎯 Vấn đề hiện tại

Document 001/2025:
- ✅ Workflow approved (2/2 steps)
- ❌ Signers: admin + approver (nội bộ) nhưng được tạo như external
- ❌ `is_internal: false` → Phải dùng OTP + link
- ❌ Progress 0/2 vì chưa ai ký

**Root Cause**: Chưa implement SPEC-INTERNAL-EXTERNAL-SIGNING.md

## 📋 Implementation Plan

### Phase 1: Database Schema (30 mins)

#### 1.1 Add fields to `signers` table
```sql
ALTER TABLE signers ADD COLUMN signer_type VARCHAR(20) DEFAULT 'external';
ALTER TABLE signers ADD COLUMN user_id INTEGER NULL;
ALTER TABLE signers ADD CONSTRAINT fk_signers_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### 1.2 Update Prisma schema
- Add `signer_type` field
- Add `user_id` field
- Add relation to `users` table

#### 1.3 Migrate existing data
```sql
-- Mark internal signers (có email @acme.local)
UPDATE signers 
SET signer_type = 'internal', 
    user_id = (SELECT id FROM users WHERE users.email = signers.email)
WHERE email LIKE '%@acme.local';
```

### Phase 2: Backend Logic (1 hour)

#### 2.1 Update SignRequestsService
**File**: `backend/src/modules/signRequests/signRequests.service.ts`

**Changes**:
- When creating signer, detect if internal (check email domain or user_id)
- Set `signer_type = 'internal'` for internal users
- Set `user_id` for internal signers
- Don't generate `signing_token` for internal signers
- Don't send OTP email for internal signers

#### 2.2 Update ApprovalsService
**File**: `backend/src/modules/approvals/approvals.service.ts`

**Changes in `approve()` method**:
- After workflow completed, check if document has signers
- If has internal signers → Auto-sign for approver (if approver is also signer)
- Update signer status to 'signed'
- Add signature_data from approval

**Logic**:
```typescript
// After workflow completed
if (allApproved) {
  // Check if approver is also a signer
  const approverAsSigner = await prisma.signers.findFirst({
    where: {
      sign_request_id: document.sign_request_id,
      user_id: approval.approver_user_id,
      signer_type: 'internal'
    }
  });

  if (approverAsSigner && approval.signature_data) {
    // Auto-sign for internal approver
    await prisma.signers.update({
      where: { id: approverAsSigner.id },
      data: {
        status: 'signed',
        signed_at: new Date(),
        signature_data: approval.signature_data,
        signature_type: approval.signature_type
      }
    });
  }
}
```

#### 2.3 Create Internal Signing Endpoint
**New endpoint**: `POST /api/v1/sign-requests/:id/sign-internal`

**Purpose**: Internal users sign document in dashboard (no OTP needed)

**Logic**:
- Check user is internal signer
- Check signing order (if sequential)
- Save signature
- Update status to 'signed'
- Move to next signer or complete

### Phase 3: Frontend (1 hour)

#### 3.1 Update Approvals Detail Page
**File**: `frontend/app/(dashboard)/approvals/[id]/page.tsx`

**Changes**:
- When approving, check if user is also a signer
- If yes, show checkbox: "Tôi cũng là người ký, ký luôn khi approve"
- If checked, require signature
- Submit both approval + signature

#### 3.2 Create Internal Signing Page
**New page**: `frontend/app/(dashboard)/sign-requests/[id]/sign`

**Purpose**: Internal users sign document

**Features**:
- Show document preview
- Show signature canvas
- Submit signature
- No OTP needed

#### 3.3 Update Sign Requests List
**File**: `frontend/app/(dashboard)/sign-requests/page.tsx`

**Changes**:
- Show different actions for internal vs external signers
- Internal: "Ký ngay" button → Open internal signing page
- External: "Copy link" + "Gửi email" buttons

### Phase 4: Fix Document 001/2025 (15 mins)

#### 4.1 Update existing signers
```sql
UPDATE signers 
SET signer_type = 'internal',
    user_id = (SELECT id FROM users WHERE users.email = signers.email)
WHERE sign_request_id = 53 
  AND email IN ('admin@acme.local', 'approver@acme.local');
```

#### 4.2 Auto-sign for approvers
- Admin đã approve → Check if admin is signer → Auto-sign
- Approver đã approve → Check if approver is signer → Auto-sign

## 📊 Estimated Time

- Phase 1: Database (30 mins)
- Phase 2: Backend (1 hour)
- Phase 3: Frontend (1 hour)
- Phase 4: Fix existing data (15 mins)
- **Total: ~3 hours**

## 🎯 Acceptance Criteria

### Internal Signing
- ✅ Internal users don't need OTP
- ✅ Internal users sign in dashboard
- ✅ Can auto-sign when approving
- ✅ Signing order enforced

### External Signing
- ✅ External users use public link
- ✅ External users need OTP
- ✅ Email sent with link + OTP
- ✅ Signing order enforced

### Mixed Signing
- ✅ Can mix internal + external in any order
- ✅ Sequential signing works
- ✅ Parallel signing works
- ✅ Progress calculated correctly

## 🔜 Next Steps

1. **Immediate**: Implement Phase 1 (Database)
2. **Then**: Implement Phase 2 (Backend)
3. **Then**: Implement Phase 3 (Frontend)
4. **Finally**: Fix Document 001/2025

**Start with**: Database migration
