# 📋 Plan: Workflow với Internal Signers tự động

## 🎯 Objective
Cho phép cấu hình workflow với internal signers (người ký nội bộ) sẵn trong workflow template. Khi tạo sign request, hệ thống tự động load internal signers từ workflow, còn external signers phải thêm tay.

## 📊 Database Schema Changes

### ✅ Phase 1: Database (COMPLETE)
```sql
-- workflow_steps table
ALTER TABLE workflow_steps 
ADD COLUMN participant_role VARCHAR(50); -- 'approver' | 'signer'
```

**Status**: ✅ Schema updated, db push complete

---

## 🔧 Phase 2: Backend Implementation (1 hour)

### 2.1 Update Workflows Service
**File**: `backend/src/modules/workflows/workflows.service.ts`

**Changes**:
- Add `participant_role` to workflow step creation
- Default to 'approver' for backward compatibility
- Validate participant_role values

### 2.2 Update Sign Requests Service  
**File**: `backend/src/modules/signRequests/signRequests.service.ts`

**New Method**: `createInternalSignersFromWorkflow()`
```typescript
async createInternalSignersFromWorkflow(
  signRequestId: number,
  workflowId: number,
  tenantId: number
): Promise<void> {
  // 1. Get workflow steps with participant_role = 'signer'
  // 2. For each step, get user info
  // 3. Create signer with is_internal = true
  // 4. Set signing_order from step_order
}
```

**Update Method**: `createSignRequest()`
- After creating sign request
- If workflow_id exists, call `createInternalSignersFromWorkflow()`
- Auto-create internal signers from workflow

### 2.3 Update Documents Service
**File**: `backend/src/modules/documents/documents.service.ts`

**Update Method**: `createDocument()`
- When creating document with workflow
- Pass workflow_id to sign request creation
- Internal signers auto-created
- External signers added manually by user

---

## 🎨 Phase 3: Frontend Implementation (1 hour)

### 3.1 Workflow Configuration UI
**File**: `frontend/components/workflow/WorkflowCustomizer.tsx`

**Changes**:
- Add role dropdown for each step
- Options: "Người phê duyệt" | "Người ký"
- Visual indicator (icon) for each role
- Only allow internal users for signer role

**UI**:
```tsx
<Select value={step.participant_role} onChange={...}>
  <option value="approver">✅ Người phê duyệt</option>
  <option value="signer">✍️ Người ký</option>
</Select>
```

### 3.2 Create Sign Request UI
**File**: `frontend/app/(dashboard)/sign-requests/create/page.tsx`

**New Component**: `InternalSignersPreview`
- Show internal signers loaded from workflow
- Read-only display (auto-loaded)
- Show: Name, Email, Order

**Update**: `SignersSection`
- Rename to "Người ký bên ngoài"
- Only for external signers
- Manual add/remove

**Layout**:
```
┌─────────────────────────────────────┐
│ Workflow: Hợp đồng mua bán         │
├─────────────────────────────────────┤
│ 👥 Người phê duyệt (tự động):     │
│ ① Trưởng phòng                     │
│ ② Giám đốc                         │
├─────────────────────────────────────┤
│ ✍️ Người ký nội bộ (tự động):     │
│ ③ Kế toán trưởng                   │
├─────────────────────────────────────┤
│ 🌐 Người ký bên ngoài (thêm tay): │
│ [+ Thêm người ký]                  │
│ ④ [Email] [Tên]                    │
└─────────────────────────────────────┘
```

---

## 🧪 Phase 4: Testing (30 mins)

### 4.1 Test Script
**File**: `backend/scripts/test-workflow-internal-signers.js`

**Test Cases**:
1. Create workflow with internal signers
2. Create sign request with workflow
3. Verify internal signers auto-created
4. Add external signers manually
5. Verify signing order correct
6. Test complete signing flow

### 4.2 Manual Testing
1. Configure workflow with mixed approvers + signers
2. Create sign request
3. Verify internal signers loaded
4. Add external signers
5. Test signing flow

---

## 📋 Implementation Checklist

### Phase 1: Database ✅
- [x] Add `participant_role` to workflow_steps
- [x] Run prisma db push
- [x] Verify schema updated

### Phase 2: Backend
- [ ] Update workflows service (participant_role)
- [ ] Add createInternalSignersFromWorkflow() method
- [ ] Update createSignRequest() to auto-create signers
- [ ] Update createDocument() integration

### Phase 3: Frontend
- [ ] Add role dropdown to WorkflowCustomizer
- [ ] Create InternalSignersPreview component
- [ ] Update SignersSection for external only
- [ ] Update create page layout

### Phase 4: Testing
- [ ] Create test script
- [ ] Test workflow creation
- [ ] Test sign request creation
- [ ] Test complete flow
- [ ] Manual UI testing

---

## 🎯 Expected Outcome

**Before**:
- All signers (internal + external) phải add thủ công
- Tốn thời gian, dễ sai sót

**After**:
- Internal signers: Tự động load từ workflow ✅
- External signers: Add thủ công (flexible) ✅
- Consistent workflow cho internal ✅
- Flexible cho external partners ✅

---

## 📊 Estimated Time
- Phase 1: Database ✅ (15 mins - DONE)
- Phase 2: Backend (1 hour)
- Phase 3: Frontend (1 hour)
- Phase 4: Testing (30 mins)
- **Total**: ~2.5 hours

---

**Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - Backend Implementation
