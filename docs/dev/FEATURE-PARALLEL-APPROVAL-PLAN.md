# Feature Plan: Parallel Approval

**Date**: 2025-11-21  
**Status**: 🚧 In Progress  
**Complexity**: High

---

## Overview

Thêm tính năng phê duyệt song song (parallel approval) cho workflow system. Cho phép nhiều người phê duyệt cùng lúc thay vì phải chờ từng người.

---

## Current State (Sequential)

```
Bước 1: Manager (step_order: 1)
   ↓ approve
Bước 2: Director (step_order: 2)
   ↓ approve  
Bước 3: CEO (step_order: 3)
   ↓ approve
✅ Completed
```

**Logic**: Chỉ chuyển sang bước tiếp theo khi bước hiện tại được approve.

---

## New Feature (Parallel)

### Example 1: Full Parallel
```
Bước 1: Manager    (is_parallel: false)
Bước 2: Director   (is_parallel: true)  ← Gửi cùng lúc với bước 1
Bước 3: CEO        (is_parallel: true)  ← Gửi cùng lúc với bước 1 & 2

→ Tất cả 3 người nhận email cùng lúc
→ Khi cả 3 approve → Completed
```

### Example 2: Mixed (Sequential + Parallel)
```
Bước 1: Manager    (is_parallel: false)
   ↓ approve
Bước 2: Director A (is_parallel: false)
Bước 3: Director B (is_parallel: true)  ← Gửi cùng lúc với bước 2
   ↓ cả 2 approve
Bước 4: CEO        (is_parallel: false)
   ↓ approve
✅ Completed
```

---

## Database Schema

### ✅ Completed

**Table**: `workflow_steps`
```sql
is_parallel BOOLEAN DEFAULT false
```

**Meaning**:
- `false` (default): Chờ bước trước xong mới gửi (Sequential)
- `true`: Gửi cùng lúc với bước trước (Parallel)

**Rules**:
- Bước 1 luôn là `is_parallel: false` (không có bước trước để parallel)
- Bước 2+ có thể chọn `true` hoặc `false`

---

## Backend Implementation

### 1. Approvals Service Logic

**Current**:
```typescript
async approve(approvalId, userId) {
  // 1. Mark current approval as approved
  // 2. Get next step (step_order + 1)
  // 3. Create approval for next step
  // 4. If no next step → mark workflow completed
}
```

**New**:
```typescript
async approve(approvalId, userId) {
  // 1. Mark current approval as approved
  
  // 2. Check if current step is complete
  //    - If sequential: 1 approval is enough
  //    - If parallel: check if ALL parallel approvals are done
  
  // 3. If current step complete:
  //    - Get next sequential step
  //    - Get all parallel steps after it
  //    - Create approvals for all of them
  
  // 4. If no next step → mark workflow completed
}
```

**Key Functions to Update**:
- `submitForApproval()` - Create initial approvals (may be multiple if parallel)
- `approve()` - Check parallel completion before moving to next
- `getNextSteps()` - NEW: Return array of next steps (sequential + parallel)
- `isStepGroupComplete()` - NEW: Check if all parallel steps are approved

### 2. Approval Repository

**New Queries**:
```typescript
// Get all steps in same parallel group
async getParallelSteps(workflowId, stepOrder) {
  // Find all steps with same "parallel group"
  // Group = consecutive steps with is_parallel: true
}

// Check if all approvals in group are approved
async isParallelGroupComplete(documentId, workflowId, stepOrders[]) {
  // Count approved vs total approvals for these steps
}
```

---

## Frontend Implementation

### 1. Workflow Builder UI

**Add Toggle for Each Step**:
```tsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={step.is_parallel}
    onChange={(e) => handleUpdateStep(index, 'is_parallel', e.target.checked)}
    disabled={index === 0} // Bước 1 không thể parallel
  />
  <label>Phê duyệt song song với bước trước</label>
</div>
```

**Visual Indicator**:
```
Bước 1: Manager
   ↓
Bước 2: Director A
   ├→ Bước 3: Director B (parallel)
   ↓
Bước 4: CEO
```

### 2. Workflow Preview

Show parallel steps with visual grouping:
```tsx
{steps.map((step, index) => (
  <div className={step.is_parallel ? 'ml-8 border-l-2' : ''}>
    {step.is_parallel && <span>⚡ Song song</span>}
    <div>Bước {index + 1}: {step.step_name}</div>
  </div>
))}
```

### 3. Approvals Page

Show all pending approvals (including parallel ones):
```tsx
<div className="approval-card">
  <h3>Văn bản #123</h3>
  <div className="parallel-group">
    <div>Bước 2: Director A - Chờ bạn</div>
    <div>Bước 3: Director B - Chờ đồng nghiệp</div>
  </div>
  <p>⚡ Phê duyệt song song - Cần cả 2 người approve</p>
</div>
```

---

## Implementation Steps

### Phase 1: Backend Core Logic ✅
- [x] Database schema update
- [ ] Update `submitForApproval()` to create multiple approvals
- [ ] Update `approve()` to check parallel completion
- [ ] Add `getNextSteps()` helper
- [ ] Add `isParallelGroupComplete()` helper

### Phase 2: Backend Testing
- [ ] Test sequential workflow (existing)
- [ ] Test full parallel workflow
- [ ] Test mixed workflow
- [ ] Test edge cases (reject in parallel group)

### Phase 3: Frontend UI
- [ ] Add `is_parallel` toggle in AdhocWorkflowBuilder
- [ ] Add `is_parallel` toggle in WorkflowCustomizer
- [ ] Update WorkflowPreview to show parallel steps
- [ ] Update Approvals page to show parallel status

### Phase 4: Integration Testing
- [ ] End-to-end test with real data
- [ ] Test email notifications
- [ ] Test deadline tracking

---

## Edge Cases to Handle

### 1. Reject in Parallel Group
**Question**: Nếu 1 trong 3 người parallel reject thì sao?

**Options**:
- A. Reject ngay lập tức (strict)
- B. Chờ tất cả vote xong rồi tính đa số (democratic)
- C. Cho phép config (flexible)

**Recommendation**: Option A (reject ngay) - đơn giản và an toàn

### 2. Request Info in Parallel
**Question**: Nếu 1 người request info thì sao?

**Options**:
- A. Block toàn bộ parallel group
- B. Chỉ block người đó, người khác vẫn approve được

**Recommendation**: Option A (block all) - đảm bảo thông tin đầy đủ

### 3. Deadline Tracking
**Question**: Deadline tính như thế nào cho parallel?

**Options**:
- A. Mỗi người có deadline riêng
- B. Dùng deadline của bước đầu tiên trong group

**Recommendation**: Option A (riêng) - công bằng hơn

---

## API Changes

### Submit for Approval
```typescript
POST /api/v1/approvals/submit

// Before: Create 1 approval for step 1
// After: Create N approvals for all parallel steps in group 1
```

### Approve
```typescript
POST /api/v1/approvals/:id/approve

// Before: Move to next step immediately
// After: Check if parallel group complete first
```

### Get Pending Approvals
```typescript
GET /api/v1/approvals/pending

// Before: Return 1 approval per document
// After: May return multiple approvals for same document (parallel)
```

---

## Testing Scenarios

### Scenario 1: Full Parallel (3 người cùng lúc)
```
Setup:
  Step 1: User A (is_parallel: false)
  Step 2: User B (is_parallel: true)
  Step 3: User C (is_parallel: true)

Test:
  1. Submit → A, B, C nhận email cùng lúc
  2. A approve → Status vẫn pending
  3. B approve → Status vẫn pending
  4. C approve → Status = completed ✅
```

### Scenario 2: Mixed (2 sequential + 2 parallel)
```
Setup:
  Step 1: User A (is_parallel: false)
  Step 2: User B (is_parallel: false)
  Step 3: User C (is_parallel: true)

Test:
  1. Submit → Chỉ A nhận email
  2. A approve → B, C nhận email cùng lúc
  3. B approve → Status vẫn pending
  4. C approve → Status = completed ✅
```

### Scenario 3: Reject in Parallel
```
Setup:
  Step 1: User A (is_parallel: false)
  Step 2: User B (is_parallel: true)
  Step 3: User C (is_parallel: true)

Test:
  1. Submit → A, B, C nhận email
  2. A approve → OK
  3. B reject → Status = rejected ❌
  4. C không cần approve nữa
```

---

## Estimated Time

- Backend Core: 2-3 hours
- Backend Testing: 1 hour
- Frontend UI: 1-2 hours
- Integration Testing: 1 hour

**Total**: 5-7 hours

---

## Next Steps

1. ✅ Database schema updated
2. 🔜 Update backend approval logic
3. 🔜 Add frontend UI toggles
4. 🔜 Test end-to-end

---

## Notes

- Feature này khá phức tạp, cần test kỹ
- Có thể ảnh hưởng đến email notifications
- Cần update documentation cho users
- Consider adding analytics (parallel vs sequential performance)

