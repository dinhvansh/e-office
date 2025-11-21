# Quick Start: Workflow System Frontend

**Status**: Backend complete ✅, Frontend TODO  
**Time**: 4 hours  
**Date**: 2025-11-21

---

## 🎯 Goal

Implement frontend UI for 4-mode workflow system.

---

## ✅ Backend Status

**All tests passing!** 🎉

```bash
cd backend
node scripts/test-4-workflow-modes.js
```

Output:
```
✅ Mode 1: No Approval - Status = "active"
✅ Mode 2: Strict Workflow - Status = "pending_approval"
✅ Mode 3: Flexible (Default) - Status = "pending_approval"
✅ Mode 3: Flexible (Customized) - Status = "pending_approval"
✅ Mode 4: Ad-hoc - Status = "pending_approval"
✅ Mode 4: Error handling - Correct error thrown
```

---

## 🔜 Frontend Tasks

### Task 1: Document Types Page (1 hour)

**File**: `frontend/app/(dashboard)/document-types/page.tsx`

**Add 3 fields to form:**

1. **Checkbox**: "Yêu cầu phê duyệt" (`require_approval`)
2. **Dropdown**: "Quy trình mặc định" (`default_workflow_id`) - conditional
3. **Checkbox**: "Cho phép tùy chỉnh" (`allow_workflow_override`) - conditional

**Logic**:
- Show dropdown only if `require_approval = true`
- Show override checkbox only if `require_approval = true` AND `default_workflow_id` is set
- Fetch workflows from `/api/v1/workflows` (filter `is_template = true`)

**Code sample in**: `CONTEXT-FOR-NEXT-SESSION.md` (lines 80-140)

---

### Task 2: Documents Upload Page (2.5 hours)

**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Steps**:

1. **Detect workflow mode** (15 mins)
   - Fetch document type details when selected
   - Determine mode based on fields

2. **Conditional rendering** (30 mins)
   - Show different UI for each mode
   - Mode 1: Info message
   - Mode 2: WorkflowPreview component
   - Mode 3: WorkflowCustomizer component
   - Mode 4: AdhocWorkflowBuilder component

3. **Create 3 components** (1.5 hours)
   - `WorkflowPreview.tsx` - Read-only workflow display
   - `WorkflowCustomizer.tsx` - Edit default workflow
   - `AdhocWorkflowBuilder.tsx` - Create from scratch

4. **Submit logic** (30 mins)
   - Add `adhoc_steps` or `customized_steps` to payload
   - Handle different modes

**Code samples in**: `CONTEXT-FOR-NEXT-SESSION.md` (lines 145-280)

---

### Task 3: Testing (30 mins)

**Test all 4 modes:**

1. Create document type with Mode 1 → Upload → Status = "active"
2. Create document type with Mode 2 → Upload → Auto-submit
3. Create document type with Mode 3 → Upload with default → Submit
4. Create document type with Mode 3 → Upload with custom → Submit
5. Create document type with Mode 4 → Upload with ad-hoc → Submit
6. Try Mode 4 without steps → Error

---

## 📚 Reference Documents

**Implementation Guide**:
- `CONTEXT-FOR-NEXT-SESSION.md` - Complete frontend code samples

**Design**:
- `docs/dev/WORKFLOW-SYSTEM-COMPLETE-DESIGN.md` - Full design with UI mockups

**Backend**:
- `docs/dev/SESSION-2025-11-21-WORKFLOW-BACKEND-COMPLETE.md` - Backend report

**Progress**:
- `TODO-WORKFLOW-IMPLEMENTATION.md` - Progress tracker

---

## 🎯 4 Workflow Modes

| Mode | require_approval | default_workflow_id | allow_override | UI Component |
|------|------------------|---------------------|----------------|--------------|
| 1. No Approval | false | - | - | Info message |
| 2. Strict | true | X | false | WorkflowPreview |
| 3. Flexible | true | X | true | WorkflowCustomizer |
| 4. Ad-hoc | true | NULL | - | AdhocWorkflowBuilder |

---

## 💡 Quick Commands

```bash
# Test backend (optional)
cd backend
node scripts/test-4-workflow-modes.js

# Check document types
node scripts/check-document-types.js

# Start frontend dev server (if not running)
cd frontend
npm run dev
```

---

## ✅ Success Criteria

- [ ] Document Types page has 3 new fields
- [ ] Workflows dropdown populated
- [ ] Conditional rendering works
- [ ] Documents Upload detects mode
- [ ] WorkflowPreview component created
- [ ] WorkflowCustomizer component created
- [ ] AdhocWorkflowBuilder component created
- [ ] Submit logic handles all modes
- [ ] All 4 modes work end-to-end
- [ ] No TypeScript errors

---

## 🚀 Let's Go!

**Start with**: Document Types page (1 hour)

**Then**: Create workflow components (2.5 hours)

**Finally**: Test everything (30 mins)

**Total**: 4 hours

---

**Note**: Backend is production-ready. Just need frontend UI!

**Quality**: High - Clean code, well-tested backend

**Risk**: Low - Clear implementation path with code samples
