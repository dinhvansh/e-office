# Workflow Modes - Quick Reference

## 🎯 4 Chế độ Workflow

### Mode 1: Không cần duyệt (No Approval)
```
require_approval = false
default_workflow_id = null
allow_workflow_override = false
```

**UI**: Info message  
**Hành động**: Chỉ upload  
**Kết quả**: Status = "active" ngay lập tức  
**Ví dụ**: Tài liệu tham khảo, Biên bản nội bộ

---

### Mode 2: Strict (Bắt buộc)
```
require_approval = true
default_workflow_id = X (có workflow)
allow_workflow_override = false
```

**UI**: WorkflowPreview (read-only)  
**Hành động**: Xem workflow, không thể sửa  
**Kết quả**: Auto-submit với workflow mặc định  
**Ví dụ**: Hợp đồng, Quyết định quan trọng

---

### Mode 3: Flexible (Linh hoạt)
```
require_approval = true
default_workflow_id = X (có workflow)
allow_workflow_override = true
```

**UI**: WorkflowCustomizer (editable)  
**Hành động**: Chọn dùng mặc định HOẶC tùy chỉnh  
**Kết quả**: Submit với workflow mặc định hoặc custom  
**Ví dụ**: Công văn, Báo cáo

---

### Mode 4: Ad-hoc (Tự tạo)
```
require_approval = true
default_workflow_id = null (không có workflow)
allow_workflow_override = false
```

**UI**: AdhocWorkflowBuilder (empty form)  
**Hành động**: Tự tạo workflow từ đầu  
**Kết quả**: Submit với workflow vừa tạo  
**Ví dụ**: Đề xuất, Yêu cầu đặc biệt

---

## 📊 So sánh

| Tính năng | Mode 1 | Mode 2 | Mode 3 | Mode 4 |
|-----------|--------|--------|--------|--------|
| Cần duyệt | ❌ | ✅ | ✅ | ✅ |
| Có workflow mặc định | ❌ | ✅ | ✅ | ❌ |
| Cho phép tùy chỉnh | ❌ | ❌ | ✅ | ✅ |
| Status sau upload | active | pending | pending | pending |
| Độ linh hoạt | Thấp | Thấp | Cao | Cao nhất |
| Độ phức tạp | Thấp | Thấp | Trung bình | Cao |

---

## 🎨 UI Components

### WorkflowPreview
- Hiển thị read-only
- Màu cam (warning)
- Không có nút edit
- Dùng cho Mode 2

### WorkflowCustomizer
- Có radio buttons (Default/Custom)
- Màu xanh (success)
- Có nút "Dùng mặc định"
- Có thể add/edit/remove steps
- Dùng cho Mode 3

### AdhocWorkflowBuilder
- Form trống
- Màu tím (info)
- Bắt buộc tạo ít nhất 1 bước
- Tối đa 10 bước
- Dùng cho Mode 4

---

## 🔧 Backend Logic

### Mode 1
```typescript
if (!docType.require_approval) {
  return document; // status = "active"
}
```

### Mode 2
```typescript
if (!docType.allow_workflow_override) {
  await submitForApproval(docType.default_workflow_id);
  return document; // status = "pending_approval"
}
```

### Mode 3
```typescript
if (customized_steps) {
  const workflow = await createCustomizedWorkflow(...);
  await submitForApproval(workflow.id);
} else {
  await submitForApproval(docType.default_workflow_id);
}
return document;
```

### Mode 4
```typescript
if (!docType.default_workflow_id) {
  const workflow = await createAdhocWorkflow(adhoc_steps);
  await submitForApproval(workflow.id);
  return document;
}
```

---

## 📝 API Payload

### Mode 1
```json
{
  "file_name": "doc.pdf",
  "file_base64": "...",
  "document_type_id": 1
}
```

### Mode 2
```json
{
  "file_name": "doc.pdf",
  "file_base64": "...",
  "document_type_id": 2
}
```

### Mode 3 (Default)
```json
{
  "file_name": "doc.pdf",
  "file_base64": "...",
  "document_type_id": 3
}
```

### Mode 3 (Custom)
```json
{
  "file_name": "doc.pdf",
  "file_base64": "...",
  "document_type_id": 3,
  "customized_steps": [
    {
      "step_name": "Bước 1",
      "approver_type": "user",
      "approver_id": 1,
      "due_in_days": 3
    }
  ]
}
```

### Mode 4
```json
{
  "file_name": "doc.pdf",
  "file_base64": "...",
  "document_type_id": 4,
  "adhoc_steps": [
    {
      "approver_user_id": 1,
      "due_in_days": 3
    },
    {
      "approver_user_id": 2,
      "due_in_days": 5
    }
  ]
}
```

---

## 🎯 Khi nào dùng chế độ nào?

### Mode 1: Không cần duyệt
- Tài liệu tham khảo
- Biên bản họp nội bộ
- Tài liệu lưu trữ
- Không có tính pháp lý

### Mode 2: Strict
- Hợp đồng quan trọng
- Quyết định nhân sự
- Văn bản pháp lý
- Cần tuân thủ quy trình cố định

### Mode 3: Flexible
- Công văn thông thường
- Báo cáo định kỳ
- Đề xuất dự án
- Cần linh hoạt theo tình huống

### Mode 4: Ad-hoc
- Yêu cầu đặc biệt
- Trường hợp ngoại lệ
- Dự án mới
- Chưa có quy trình chuẩn

---

## 💡 Best Practices

1. **Mode 1**: Dùng cho tài liệu không quan trọng
2. **Mode 2**: Dùng cho quy trình bắt buộc, không thay đổi
3. **Mode 3**: Dùng cho hầu hết các trường hợp (khuyến nghị)
4. **Mode 4**: Dùng khi chưa có quy trình hoặc trường hợp đặc biệt

---

## 🔒 Security

- Mode 1: Rủi ro thấp (không cần duyệt)
- Mode 2: An toàn cao (quy trình cố định)
- Mode 3: An toàn trung bình (có thể tùy chỉnh)
- Mode 4: Cần kiểm soát (user tự tạo)

---

## 📈 Performance

- Mode 1: Nhanh nhất (không tạo workflow)
- Mode 2: Nhanh (dùng template có sẵn)
- Mode 3: Trung bình (có thể tạo workflow mới)
- Mode 4: Chậm nhất (luôn tạo workflow mới)

---

**Khuyến nghị**: Dùng Mode 3 (Flexible) cho hầu hết các trường hợp!
