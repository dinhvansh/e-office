# Feature: UI Trình ký văn bản (Submit for Approval)

## 📅 Completed: 2025-11-21

## 🎯 Mục tiêu
Thêm UI để người dùng trình ký văn bản sau khi upload

## ✅ Đã hoàn thành

### 1. Button "Trình ký" trong danh sách documents
- Icon: Send (✉️)
- Chỉ hiện với văn bản có status = "draft"
- Click → Mở dialog chọn workflow

### 2. Dialog chọn quy trình phê duyệt
- Dropdown: Chọn workflow (Phê duyệt 2 cấp, Phê duyệt hợp đồng, v.v.)
- Hiển thị số bước của workflow
- Button "Trình ký" để submit
- Button "Hủy bỏ" để đóng

### 3. API Integration
- Endpoint: `POST /api/v1/approvals/submit`
- Payload: `{ document_id, workflow_id }`
- Toast notification khi thành công/thất bại
- Auto refresh danh sách documents

## 🎨 UI Flow

### **Bước 1: Upload văn bản**
```
1. Vào trang /documents
2. Chọn loại văn bản
3. Upload file PDF
4. (Optional) Chọn workflow ngay khi upload
   → Hoặc bỏ qua, trình ký sau
```

### **Bước 2: Trình ký sau khi upload**
```
1. Trong danh sách documents
2. Tìm văn bản có status "draft"
3. Click button "Trình ký" (icon Send)
4. Dialog hiện ra
5. Chọn quy trình phê duyệt
6. Click "Trình ký"
7. Toast: "Trình ký thành công!"
8. Status văn bản → "pending_approval"
```

## 📊 Trạng thái văn bản

| Status | Mô tả | Actions |
|--------|-------|---------|
| **draft** | Mới upload, chưa trình ký | ✅ Trình ký, Xem, Tải, Xóa |
| **pending_approval** | Đang chờ phê duyệt | Xem, Tải |
| **approved** | Đã được phê duyệt | Xem, Tải |
| **rejected** | Bị từ chối | Xem, Tải, (TODO: Re-submit) |

## 🔧 Technical Details

### Frontend Changes
**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Added:**
- State: `submitApprovalDialog`, `selectedWorkflowForApproval`
- Mutation: `submitApprovalMutation`
- Handler: `handleSubmitApproval()`, `confirmSubmitApproval()`
- UI: Submit approval dialog
- Button: "Trình ký" (conditional render for draft status)

### Backend API
**Endpoint**: `POST /api/v1/approvals/submit`

**Request:**
```json
{
  "document_id": 10,
  "workflow_id": 1
}
```

**Response:**
```json
{
  "instance": { ... },
  "approvals": 2,
  "message": "Document submitted for approval. 2 approver(s) notified."
}
```

## 🧪 Testing

### Manual Test
1. Login as admin@acme.local
2. Upload document (chọn loại văn bản, không chọn workflow)
3. Trong danh sách, click button "Trình ký" (icon Send)
4. Chọn workflow "Phê duyệt 2 cấp"
5. Click "Trình ký"
6. Verify:
   - Toast: "Trình ký thành công!"
   - Status → "pending_approval"
   - Button "Trình ký" biến mất

### API Test
```http
### Submit for approval
POST http://localhost:4000/api/v1/approvals/submit
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "document_id": 10,
  "workflow_id": 1
}
```

## 📸 Screenshots

### Before (Draft status):
```
[Eye] [Download] [Send] [Trash]
                  ↑
            Button "Trình ký"
```

### After (Pending approval):
```
[Eye] [Download] [Trash]
(Button "Trình ký" đã ẩn)
```

### Dialog:
```
┌─────────────────────────────────┐
│  ✉️  Trình ký văn bản           │
│                                  │
│  Quy trình phê duyệt *          │
│  [Phê duyệt 2 cấp (2 bước) ▼]  │
│                                  │
│  [Hủy bỏ]  [✉️ Trình ký]       │
└─────────────────────────────────┘
```

## 🎯 User Stories

### Story 1: Trình ký ngay khi upload
```
AS a user
WHEN I upload a document
I CAN select a workflow immediately
SO THAT the document is submitted for approval right away
```

### Story 2: Trình ký sau khi upload
```
AS a user
WHEN I have a draft document
I CAN click "Trình ký" button
AND select a workflow
SO THAT I can submit it for approval later
```

### Story 3: Không thể trình ký lại
```
AS a user
WHEN a document is already pending approval
I CANNOT see the "Trình ký" button
SO THAT I don't submit it twice
```

## 🔜 Future Enhancements

### Phase 2.5 (Optional):
- [ ] Re-submit after rejection
- [ ] Edit workflow before submit
- [ ] Preview workflow steps before submit
- [ ] Bulk submit (select multiple documents)

### Phase 3:
- [ ] Email notification to approvers
- [ ] Deadline reminder
- [ ] Workflow history timeline

## 📝 Notes
- Button chỉ hiện với status = "draft"
- Workflow dropdown chỉ hiện workflows active
- Toast notification cho user feedback
- Auto refresh danh sách sau khi submit

## 🔗 Related Files
- `frontend/app/(dashboard)/documents/page.tsx` - Main UI
- `backend/src/modules/approvals/approvals.service.ts` - Submit logic
- `backend/src/modules/approvals/approvals.controller.ts` - API endpoint
- `test-approvals.http` - API test cases

## 🎉 Result
**UI để trình ký văn bản: 100% Complete!** ✅
- ✅ Button "Trình ký" trong danh sách
- ✅ Dialog chọn workflow
- ✅ API integration
- ✅ Toast notifications
- ✅ Conditional rendering (draft only)
- ✅ Auto refresh after submit
