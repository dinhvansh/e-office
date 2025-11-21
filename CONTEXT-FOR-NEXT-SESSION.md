# Context for Next Session - Workflow System Frontend

## 📋 Quick Summary

**Previous Session:** 2025-11-21 (~1 hour)  
**Completed:** Database schema + Backend implementation ✅  
**Remaining:** Frontend UI (~4 hours)

---

## ✅ What's Done

### **1. Database Schema - COMPLETE ✅**
```prisma
// document_types - Added 3 fields
require_approval: Boolean @default(false)
default_workflow_id: Int?
allow_workflow_override: Boolean @default(false)

// workflows - Added 3 fields
is_template: Boolean @default(true)
created_for_doc: Int?
based_on_template: Int?
```

**Status:** `npx prisma db push` - Success ✅

### **2. Backend Implementation - COMPLETE ✅**

**Files Updated:**
- `backend/src/modules/documents/documents.service.ts`
  - Added `createAdhocWorkflow()` method (60 lines)
  - Added `createCustomizedWorkflow()` method (80 lines)
  - Updated `createDocument()` with 4-mode logic (100 lines)

- `backend/src/modules/documents/documents.controller.ts`
  - Updated validation schema (adhoc_steps, customized_steps)

- `backend/src/modules/documentTypes/documentTypes.service.ts`
  - Added workflow validation

**Test Results:** All 6 tests passing ✅
```
✅ Mode 1: No Approval - Status = "active"
✅ Mode 2: Strict Workflow - Status = "pending_approval"
✅ Mode 3: Flexible (Default) - Status = "pending_approval"
✅ Mode 3: Flexible (Customized) - Status = "pending_approval"
✅ Mode 4: Ad-hoc - Status = "pending_approval"
✅ Mode 4: Error handling - Correct error thrown
```

**Test Script:** `backend/scripts/test-4-workflow-modes.js`  
**Seed Script:** `backend/scripts/seed-workflow-modes.js`

---

## 🎯 4 Workflow Modes

| Mode | Setup | Behavior |
|------|-------|----------|
| **1. No Approval** | require_approval = false | Upload → Active |
| **2. Strict** | require_approval = true, default_workflow_id = X, allow_override = false | Upload → Auto-submit |
| **3. Flexible** | require_approval = true, default_workflow_id = X, allow_override = true | Upload → Customize → Submit |
| **4. Ad-hoc** | require_approval = true, default_workflow_id = NULL | Upload → Create workflow → Submit |

---

## 🔜 Next Session Tasks

### **Task 1: Frontend - Document Types Page (1 hour)**

**File:** `frontend/app/(dashboard)/document-types/page.tsx`

**Add 3 form fields:**

```tsx
// 1. Checkbox: Require Approval
<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    id="require_approval"
    checked={formData.require_approval}
    onChange={(e) => setFormData({
      ...formData,
      require_approval: e.target.checked,
      // Reset workflow fields if unchecked
      default_workflow_id: e.target.checked ? formData.default_workflow_id : null,
      allow_workflow_override: e.target.checked ? formData.allow_workflow_override : false,
    })}
  />
  <label htmlFor="require_approval">Yêu cầu phê duyệt</label>
</div>

// 2. Dropdown: Default Workflow (conditional)
{formData.require_approval && (
  <div>
    <label>Quy trình mặc định</label>
    <select
      value={formData.default_workflow_id || ''}
      onChange={(e) => setFormData({
        ...formData,
        default_workflow_id: e.target.value ? parseInt(e.target.value) : null,
        // Reset override if no workflow selected
        allow_workflow_override: e.target.value ? formData.allow_workflow_override : false,
      })}
    >
      <option value="">-- Không chọn (User tự tạo) --</option>
      {workflows.map(w => (
        <option key={w.id} value={w.id}>{w.name}</option>
      ))}
    </select>
    <p className="text-sm text-gray-500">
      Để trống nếu muốn user tự tạo luồng ký (Ad-hoc mode)
    </p>
  </div>
)}

// 3. Checkbox: Allow Override (conditional)
{formData.require_approval && formData.default_workflow_id && (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      id="allow_workflow_override"
      checked={formData.allow_workflow_override}
      onChange={(e) => setFormData({
        ...formData,
        allow_workflow_override: e.target.checked,
      })}
    />
    <label htmlFor="allow_workflow_override">
      Cho phép tùy chỉnh luồng ký
    </label>
  </div>
)}
```

**Fetch workflows:**
```tsx
const [workflows, setWorkflows] = useState([]);

useEffect(() => {
  fetchJson('/workflows').then(data => {
    setWorkflows(data.workflows.filter(w => w.is_template));
  });
}, []);
```

---

### **Task 2: Frontend - Documents Upload Page (2.5 hours)**

**File:** `frontend/app/(dashboard)/documents/page.tsx`

#### Step 1: Detect Workflow Mode (15 mins)

```tsx
// After selecting document type
const [selectedDocType, setSelectedDocType] = useState(null);
const [workflowMode, setWorkflowMode] = useState(null);

useEffect(() => {
  if (selectedDocType) {
    // Fetch document type details
    fetchJson(`/document-types/${selectedDocType}`).then(docType => {
      if (!docType.require_approval) {
        setWorkflowMode('no_approval'); // Mode 1
      } else if (!docType.default_workflow_id) {
        setWorkflowMode('adhoc'); // Mode 4
      } else if (!docType.allow_workflow_override) {
        setWorkflowMode('strict'); // Mode 2
      } else {
        setWorkflowMode('flexible'); // Mode 3
      }
    });
  }
}, [selectedDocType]);
```

#### Step 2: Conditional Rendering (30 mins)

```tsx
{workflowMode === 'no_approval' && (
  <p className="text-sm text-gray-500">
    ℹ️ Loại văn bản này không cần phê duyệt
  </p>
)}

{workflowMode === 'strict' && (
  <WorkflowPreview workflowId={selectedDocType.default_workflow_id} />
)}

{workflowMode === 'flexible' && (
  <WorkflowCustomizer
    defaultWorkflowId={selectedDocType.default_workflow_id}
    onCustomize={(steps) => setCustomizedSteps(steps)}
  />
)}

{workflowMode === 'adhoc' && (
  <AdhocWorkflowBuilder
    onBuild={(steps) => setAdhocSteps(steps)}
  />
)}
```

#### Step 3: Create Components (1.5 hours)

**Component 1:** `frontend/components/workflow/WorkflowPreview.tsx` (30 mins)
```tsx
// Read-only display of workflow steps
// Fetch workflow steps and show in list
// No editing allowed
```

**Component 2:** `frontend/components/workflow/WorkflowCustomizer.tsx` (45 mins)
```tsx
// Show default workflow steps
// Allow editing: change approver, change due_in_days
// Add/remove steps
// "Sử dụng mặc định" button to reset
```

**Component 3:** `frontend/components/workflow/AdhocWorkflowBuilder.tsx` (45 mins)
```tsx
// Empty form to create workflow from scratch
// Add step button
// Select approver (user dropdown)
// Set due_in_days (number input)
// Remove step button
// Minimum 1 step required
```

#### Step 4: Submit Logic (30 mins)

```tsx
const handleSubmit = async () => {
  const payload = {
    file_name: file.name,
    file_base64: base64,
    document_type_id: selectedDocType.id,
    title: title,
  };

  // Add workflow data based on mode
  if (workflowMode === 'adhoc') {
    payload.adhoc_steps = adhocSteps;
  } else if (workflowMode === 'flexible' && customizedSteps) {
    payload.customized_steps = customizedSteps;
  }

  await fetchJson('/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
```

---

### **Task 3: Testing (30 mins)**

**Test Checklist:**
- [ ] Create document type with Mode 1 (No approval)
- [ ] Upload document → Status = "active"
- [ ] Create document type with Mode 2 (Strict)
- [ ] Upload document → Auto-submit → Status = "pending_approval"
- [ ] Create document type with Mode 3 (Flexible)
- [ ] Upload with default workflow → Status = "pending_approval"
- [ ] Upload with customized workflow → Status = "pending_approval"
- [ ] Create document type with Mode 4 (Ad-hoc)
- [ ] Upload with ad-hoc workflow → Status = "pending_approval"
- [ ] Try upload without steps → Error

---

## 📚 Key Documents

**Backend (DONE):**
- `docs/dev/SESSION-2025-11-21-WORKFLOW-BACKEND-COMPLETE.md` - Backend report
- `backend/scripts/test-4-workflow-modes.js` - Test script

**Frontend (TODO):**
- `docs/dev/WORKFLOW-SYSTEM-COMPLETE-DESIGN.md` - Full design with UI mockups

**Reference:**
- `TODO-WORKFLOW-IMPLEMENTATION.md` - Progress tracker
- `docs/dev/WORKFLOW-SYSTEM-SUMMARY.md` - Overview

---

## 💡 Quick Start Commands

```bash
# Backend is already running with new code
# Just start implementing frontend

# Test backend (optional)
cd backend
node scripts/test-4-workflow-modes.js
```

---

## 🎯 Session Goal

**Implement frontend UI for 4-mode workflow system**

**Success Criteria:**
- [ ] Document Types page has 3 new fields
- [ ] Documents Upload page detects workflow mode
- [ ] 3 workflow components created
- [ ] All 4 modes work end-to-end
- [ ] No TypeScript errors

**Time:** 4 hours

---

## 📊 Progress Tracker

- [x] Phase 1: Database (30 mins) - DONE
- [x] Phase 2: Backend (1 hour) - DONE ✅
- [ ] Phase 3: Frontend Types (1 hour) - TODO
- [ ] Phase 4: Frontend Upload (2.5 hours) - TODO
- [ ] Phase 5: Testing (30 mins) - TODO

**Total:** 50% complete (3.5 / 7 hours)

---

## 🚀 Let's Go!

**First task:** Update Document Types page (1 hour)

**Then:** Create workflow components (2.5 hours)

**Finally:** Test everything (30 mins)

---

**Note:** Backend is production-ready, all tests passing. Just need frontend UI!

**Quality:** High - Clean code, well-tested

**Risk:** Low - Clear implementation path
