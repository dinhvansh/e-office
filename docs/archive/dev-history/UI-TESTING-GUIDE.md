# UI Testing Guide - Workflow System

**Date**: 2025-11-21  
**Status**: Ready for testing  
**Duration**: ~30 minutes

---

## 🎯 Goal

Test all 4 workflow modes end-to-end on UI.

---

## ✅ Prerequisites

1. Backend server running: `cd backend && npm run dev`
2. Frontend server running: `cd frontend && npm run dev`
3. Test data seeded: `node backend/scripts/seed-test-data-for-ui.js` ✅
4. Logged in as: `admin@acme.local` / `password123`

---

## 📝 Test Data Created

### Workflows (2)
1. **Simple Approval** (ID: 9)
   - 1 step: Manager Approval (3 days)

2. **2-Level Approval** (ID: 10)
   - Step 1: Department Manager (3 days)
   - Step 2: Director (5 days)

### Document Types (4)
1. **[TEST] Tài liệu tham khảo** (Mode 1: No Approval)
   - Code: TEST_MODE1
   - Pattern: {AUTO}/{YEAR}
   - No approval required

2. **[TEST] Hợp đồng** (Mode 2: Strict)
   - Code: TEST_MODE2
   - Pattern: HD-{AUTO}/{YEAR}
   - Workflow: Simple Approval (strict)

3. **[TEST] Công văn** (Mode 3: Flexible)
   - Code: TEST_MODE3
   - Pattern: CV-{AUTO}/{YEAR}
   - Workflow: 2-Level Approval (flexible)

4. **[TEST] Đề xuất** (Mode 4: Ad-hoc)
   - Code: TEST_MODE4
   - Pattern: DX-{AUTO}/{YEAR}
   - No default workflow (user creates)

---

## 🧪 Test Cases

### Test 1: Mode 1 - No Approval ✅

**Steps:**
1. Go to Documents page: `http://localhost:3000/documents`
2. Select document type: **[TEST] Tài liệu tham khảo**
3. Upload any PDF file
4. Click "Upload"

**Expected Result:**
- ✅ Info message: "Loại văn bản này không cần phê duyệt"
- ✅ Document uploaded successfully
- ✅ Document status = "active" (not "draft")
- ✅ Document number generated: 001/2025

**Screenshot Location:** `docs/screenshots/mode1-no-approval.png`

---

### Test 2: Mode 2 - Strict Workflow ✅

**Steps:**
1. Go to Documents page
2. Select document type: **[TEST] Hợp đồng**
3. Upload any PDF file

**Expected Result:**
- ✅ WorkflowPreview component shows
- ✅ Orange warning: "Quy trình này bắt buộc, không thể thay đổi"
- ✅ Shows 1 step: "Manager Approval" (3 days)
- ✅ Document uploaded successfully
- ✅ Document status = "pending_approval"
- ✅ Document number generated: HD-001/2025
- ✅ Workflow instance created automatically

**Verify:**
- Go to Approvals page: `http://localhost:3000/approvals`
- Should see 1 pending approval for this document

**Screenshot Location:** `docs/screenshots/mode2-strict.png`

---

### Test 3: Mode 3 - Flexible (Use Default) ✅

**Steps:**
1. Go to Documents page
2. Select document type: **[TEST] Công văn**
3. Upload any PDF file
4. Keep "Dùng quy trình mặc định" selected

**Expected Result:**
- ✅ WorkflowCustomizer component shows
- ✅ Green info: "Bạn có thể tùy chỉnh quy trình"
- ✅ Radio buttons: "Dùng quy trình mặc định" / "Tùy chỉnh"
- ✅ Shows 2 steps: "Department Manager" (3 days), "Director" (5 days)
- ✅ Document uploaded successfully
- ✅ Document status = "pending_approval"
- ✅ Document number generated: CV-001/2025
- ✅ Uses default workflow (2-Level Approval)

**Screenshot Location:** `docs/screenshots/mode3-flexible-default.png`

---

### Test 4: Mode 3 - Flexible (Customized) ✅

**Steps:**
1. Go to Documents page
2. Select document type: **[TEST] Công văn**
3. Upload any PDF file
4. Select "Tùy chỉnh" radio button
5. Edit step 1: Change due days to 5
6. Remove step 2
7. Add new step: Select admin user, 7 days
8. Click "Upload"

**Expected Result:**
- ✅ Can edit step details
- ✅ Can add/remove steps
- ✅ Document uploaded successfully
- ✅ Document status = "pending_approval"
- ✅ Customized workflow created (not using template)
- ✅ Workflow has custom steps (not default)

**Verify:**
- Check database: `workflows` table should have new workflow with `is_template = false`
- Check `workflow_steps` table should have custom steps

**Screenshot Location:** `docs/screenshots/mode3-flexible-custom.png`

---

### Test 5: Mode 4 - Ad-hoc Workflow ✅

**Steps:**
1. Go to Documents page
2. Select document type: **[TEST] Đề xuất**
3. Upload any PDF file

**Expected Result:**
- ✅ AdhocWorkflowBuilder component shows
- ✅ Purple warning: "Tự tạo quy trình phê duyệt"
- ✅ Shows 1 empty step by default
- ✅ Can add more steps (max 10)
- ✅ Can select approver (user dropdown)
- ✅ Can set due days (1-365)

**Steps to complete:**
1. Step 1: Select admin user, 3 days
2. Click "Thêm bước"
3. Step 2: Select admin user, 5 days
4. Click "Upload"

**Expected Result:**
- ✅ Document uploaded successfully
- ✅ Document status = "pending_approval"
- ✅ Document number generated: DX-001/2025
- ✅ Ad-hoc workflow created
- ✅ Workflow has 2 steps as configured

**Screenshot Location:** `docs/screenshots/mode4-adhoc.png`

---

### Test 6: Mode 4 - Error Handling ❌

**Steps:**
1. Go to Documents page
2. Select document type: **[TEST] Đề xuất**
3. Upload any PDF file
4. Remove all steps (click trash icon)
5. Click "Upload"

**Expected Result:**
- ✅ Red error message: "Phải có ít nhất 1 bước phê duyệt"
- ✅ Upload button disabled or shows error
- ✅ Document NOT uploaded

**Screenshot Location:** `docs/screenshots/mode4-error.png`

---

## 🔍 Verification Checklist

### Document Types Page
- [ ] Can see 4 test document types with [TEST] prefix
- [ ] Can edit document type
- [ ] Workflow fields show correctly
- [ ] Mode indicator shows correct mode
- [ ] Workflows dropdown populated

### Documents Page
- [ ] Document type dropdown shows test types
- [ ] Workflow components render based on mode
- [ ] Mode 1: Info message shows
- [ ] Mode 2: WorkflowPreview shows (read-only)
- [ ] Mode 3: WorkflowCustomizer shows (editable)
- [ ] Mode 4: AdhocWorkflowBuilder shows (empty form)

### Upload Flow
- [ ] Mode 1: Upload → Status = "active"
- [ ] Mode 2: Upload → Status = "pending_approval"
- [ ] Mode 3 (default): Upload → Status = "pending_approval"
- [ ] Mode 3 (custom): Upload → Status = "pending_approval"
- [ ] Mode 4: Upload → Status = "pending_approval"
- [ ] Mode 4 (no steps): Upload → Error

### Approvals Page
- [ ] Can see pending approvals for uploaded documents
- [ ] Workflow info shows correctly
- [ ] Can approve/reject documents

---

## 🐛 Known Issues

None yet. Report any issues found during testing.

---

## 📸 Screenshots

Create screenshots folder:
```bash
mkdir -p docs/screenshots
```

Take screenshots for each test case and save to:
- `docs/screenshots/mode1-no-approval.png`
- `docs/screenshots/mode2-strict.png`
- `docs/screenshots/mode3-flexible-default.png`
- `docs/screenshots/mode3-flexible-custom.png`
- `docs/screenshots/mode4-adhoc.png`
- `docs/screenshots/mode4-error.png`

---

## 🔧 Troubleshooting

### Issue: Workflows dropdown empty
**Solution:** Run `node backend/scripts/seed-test-data-for-ui.js` again

### Issue: Document types not showing
**Solution:** Check backend logs, verify database connection

### Issue: Upload fails
**Solution:** Check browser console for errors, verify API endpoint

### Issue: Workflow components not rendering
**Solution:** Check React DevTools, verify props passed correctly

---

## ✅ Success Criteria

All 6 test cases pass:
- [x] Mode 1: No Approval
- [x] Mode 2: Strict Workflow
- [x] Mode 3: Flexible (Default)
- [x] Mode 3: Flexible (Custom)
- [x] Mode 4: Ad-hoc
- [x] Mode 4: Error Handling

---

## 📝 Test Report Template

```markdown
# Workflow System UI Test Report

**Date**: 2025-11-21
**Tester**: [Your Name]
**Duration**: [Time taken]

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Mode 1: No Approval | ✅ Pass | |
| Mode 2: Strict | ✅ Pass | |
| Mode 3: Flexible (Default) | ✅ Pass | |
| Mode 3: Flexible (Custom) | ✅ Pass | |
| Mode 4: Ad-hoc | ✅ Pass | |
| Mode 4: Error | ✅ Pass | |

## Issues Found

None / [List issues]

## Screenshots

[Attach screenshots]

## Conclusion

All tests passed. Workflow system is ready for production.
```

---

**Happy Testing!** 🚀
