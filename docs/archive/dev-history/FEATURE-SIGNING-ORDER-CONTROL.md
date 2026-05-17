# Feature: Signing Order Control (Kiểm soát thứ tự ký)

**Date**: 2025-11-23  
**Status**: 📋 Planning  
**Estimated Time**: 2-3 hours

## 🎯 Goal

Cho phép user chọn thứ tự giữa 2 luồng:
1. **Workflow nội bộ** (Internal Approval)
2. **External Signers** (Người ký bên ngoài)

## 📋 Requirements

### Option 1: Internal First (Nội bộ trước) ⭐ Default
```
Workflow (1→2→3) → External Signers (1→2→3)
```
- Phê duyệt nội bộ trước
- Sau đó mới gửi cho bên ngoài

### Option 2: External First (Bên ngoài trước)
```
External Signers (1→2→3) → Workflow (1→2→3)
```
- Bên ngoài ký trước
- Sau đó nội bộ phê duyệt

### Option 3: Parallel (Song song)
```
Workflow (1→2→3) ⚡ External Signers (1→2→3)
```
- Cả 2 chạy đồng thời
- Hoàn thành khi CẢ 2 xong

## 🎨 UI Design

### Upload Form - Thêm Radio Buttons

```
┌─────────────────────────────────────────────┐
│ 📋 Phê duyệt và ký nội bộ                   │
│ Workflow: 3 bước                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✍️ Người ký bên ngoài                       │
│ [Thêm người ký] [Thêm tổ chức]             │
│ • Người ký #1                               │
│ • Tổ chức #2                                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🔄 Thứ tự thực hiện                         │
├─────────────────────────────────────────────┤
│ ○ Nội bộ trước, sau đó bên ngoài (Mặc định)│
│ ○ Bên ngoài trước, sau đó nội bộ           │
│ ○ Song song (cả 2 cùng lúc)               │
└─────────────────────────────────────────────┘
```

## 🏗️ Implementation

### 1. Database Schema (10 mins)

**Add field to `documents` table**:
```sql
ALTER TABLE documents 
ADD COLUMN signing_order_mode VARCHAR(20) DEFAULT 'internal_first';

-- Values: 'internal_first', 'external_first', 'parallel'
```

### 2. Frontend State (15 mins)

**File**: `frontend/app/(dashboard)/documents/page.tsx`

```typescript
const [signingOrderMode, setSigningOrderMode] = useState<
  'internal_first' | 'external_first' | 'parallel'
>('internal_first');
```

### 3. UI Component (30 mins)

**Create**: `frontend/components/documents/SigningOrderSelector.tsx`

```tsx
interface SigningOrderSelectorProps {
  value: 'internal_first' | 'external_first' | 'parallel';
  onChange: (value: 'internal_first' | 'external_first' | 'parallel') => void;
  hasWorkflow: boolean;
  hasExternalSigners: boolean;
}

export function SigningOrderSelector({ ... }) {
  // Only show if BOTH workflow AND external signers exist
  if (!hasWorkflow || !hasExternalSigners) return null;
  
  return (
    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
      <h3>🔄 Thứ tự thực hiện</h3>
      <RadioGroup value={value} onValueChange={onChange}>
        <RadioGroupItem value="internal_first">
          Nội bộ trước, sau đó bên ngoài (Khuyến nghị)
        </RadioGroupItem>
        <RadioGroupItem value="external_first">
          Bên ngoài trước, sau đó nội bộ
        </RadioGroupItem>
        <RadioGroupItem value="parallel">
          Song song (cả 2 cùng lúc)
        </RadioGroupItem>
      </RadioGroup>
    </div>
  );
}
```

### 4. Backend Logic (1 hour)

**File**: `backend/src/modules/documents/documents.service.ts`

```typescript
// Save signing_order_mode
const document = await documentsRepository.create({
  ...payload,
  signing_order_mode: input.signingOrderMode || 'internal_first',
});

// Logic based on mode
if (signingOrderMode === 'internal_first') {
  // Create workflow first
  // External signers will be triggered after workflow completes
} else if (signingOrderMode === 'external_first') {
  // Send to external signers first
  // Workflow will be triggered after all external signatures
} else if (signingOrderMode === 'parallel') {
  // Start both at the same time
  // Document completes when BOTH are done
}
```

### 5. Workflow Completion Hook (30 mins)

**File**: `backend/src/modules/approvals/approvals.service.ts`

```typescript
async approve(approvalId, userId) {
  // ... existing logic
  
  // Check if workflow is complete
  if (allStepsApproved) {
    const document = await getDocument(approval.document_id);
    
    // If internal_first mode, now trigger external signers
    if (document.signing_order_mode === 'internal_first') {
      await triggerExternalSigners(document.id);
    }
  }
}
```

### 6. External Signing Completion Hook (30 mins)

**File**: `backend/src/modules/signers/signers.service.ts`

```typescript
async completeSignature(signerId) {
  // ... existing logic
  
  // Check if all external signers completed
  if (allSignersCompleted) {
    const document = await getDocument(signer.document_id);
    
    // If external_first mode, now trigger workflow
    if (document.signing_order_mode === 'external_first') {
      await triggerWorkflow(document.id);
    }
  }
}
```

## 📊 Database Changes

```prisma
model documents {
  // ... existing fields
  signing_order_mode String? @default("internal_first") // 'internal_first', 'external_first', 'parallel'
}
```

## 🎯 User Flow

### Scenario 1: Internal First (Default)
```
1. Upload document
2. Select workflow + external signers
3. Choose "Nội bộ trước" (default)
4. Upload → Status: pending_approval
5. Workflow: Manager → Director → CEO approve
6. After CEO approves → Auto send to external signers
7. External: Partner A → Customer B sign
8. Status: completed
```

### Scenario 2: External First
```
1. Upload document
2. Select workflow + external signers
3. Choose "Bên ngoài trước"
4. Upload → Status: pending_signature
5. External: Partner A → Customer B sign
6. After all signed → Auto trigger workflow
7. Workflow: Manager → Director → CEO approve
8. Status: completed
```

### Scenario 3: Parallel
```
1. Upload document
2. Select workflow + external signers
3. Choose "Song song"
4. Upload → Status: pending_approval_and_signature
5. Workflow: Manager → Director → CEO (parallel)
6. External: Partner A → Customer B (parallel)
7. Both complete → Status: completed
```

## ✅ Acceptance Criteria

- [ ] Radio buttons hiển thị khi có CẢ workflow VÀ external signers
- [ ] Default: "Nội bộ trước"
- [ ] Backend lưu signing_order_mode
- [ ] Internal first: Workflow → External
- [ ] External first: External → Workflow
- [ ] Parallel: Cả 2 cùng lúc
- [ ] Document status update đúng
- [ ] Email notifications đúng thứ tự

## 📝 Notes

### Conditional Display
- Chỉ hiện selector khi:
  - ✅ Document type có `require_approval = true` (có workflow)
  - ✅ User đã thêm external signers
- Nếu chỉ có 1 trong 2 → Không cần chọn thứ tự

### Status Management
- `internal_first`: pending_approval → pending_signature → completed
- `external_first`: pending_signature → pending_approval → completed
- `parallel`: pending_approval_and_signature → completed

## 🚀 Implementation Steps

1. **Database** (10 mins)
   - Add `signing_order_mode` column
   - Run migration

2. **Frontend Component** (30 mins)
   - Create SigningOrderSelector
   - Add to upload form
   - State management

3. **Backend Service** (1 hour)
   - Save mode to database
   - Implement 3 modes logic
   - Workflow completion hook
   - External signing completion hook

4. **Testing** (30 mins)
   - Test all 3 modes
   - Test status transitions
   - Test email notifications

**Total**: 2-3 hours

---

**Status**: 📋 Ready for Implementation  
**Priority**: Medium  
**Complexity**: Medium

