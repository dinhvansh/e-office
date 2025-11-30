# Fix: Customized Workflow Approver ID Issue

## Vấn đề

Khi user chọn workflow cố định rồi chuyển sang chế độ "Tùy chỉnh", các `approver_id` được copy từ template workflow nhưng có thể không hợp lệ:

- Template workflow có `approver_type = 'department'` với `approver_id = null` hoặc ID không tồn tại
- Template workflow có `approver_type = 'role'` với `approver_id` không tồn tại
- Khi user không thay đổi gì và submit, các ID không hợp lệ này được gửi lên backend
- Backend tạo workflow steps với `approver_id` không hợp lệ
- Khi tìm người phê duyệt, không tìm thấy department/role → không có ai được assign

## Ví dụ thực tế

**Document #76 (024/2025)**:
- Workflow: "Phê duyệt hợp đồng (Tùy chỉnh cho #76)"
- Bước 1: `approver_type = 'department'`, `approver_id = 9` → Department ID 9 không tồn tại
- Bước 2: `approver_type = 'role'`, `approver_id = 16` → Role ID 16 không tồn tại
- Kết quả: Không có ai được assign để phê duyệt

## Nguyên nhân

Trong `WorkflowCustomizer.tsx`, khi chuyển sang chế độ "Tùy chỉnh":

```typescript
// ❌ CODE CŨ - Copy trực tiếp approver_id từ template
setCustomSteps(
  defaultSteps.map((step: any, idx: number) => ({
    step_name: step.step_name,
    approver_type: step.approver_type,  // Có thể là 'department' hoặc 'role'
    approver_id: step.approver_id,      // Có thể là null hoặc ID không hợp lệ
    participant_role: step.participant_role || 'approver',
    due_in_days: step.due_in_days,
    order: idx + 1,
  }))
);
```

## Giải pháp

Khi copy từ template sang customized mode:
1. **Force `approver_type` thành `'user'`** - Customized workflow chỉ hỗ trợ chọn user cụ thể
2. **Set `approver_id` = null nếu không hợp lệ** - User PHẢI chọn người, không tự động set default
3. **Hiển thị cảnh báo** - Visual indicator cho các bước chưa chọn người
4. **Validation warning** - Cảnh báo tổng thể nếu có bước nào chưa chọn

```typescript
// ✅ CODE MỚI - Set null và yêu cầu user chọn
setCustomSteps(
  defaultSteps.map((step: any, idx: number) => {
    // Keep approver_id ONLY if it's a valid user type
    let approverId = null;
    
    if (step.approver_type === 'user' && step.approver_id) {
      approverId = step.approver_id;
    }
    // For department/role/manager types, leave null - user MUST choose
    
    return {
      step_name: step.step_name,
      approver_type: 'user',  // ✅ Force to 'user' type
      approver_id: approverId, // ✅ null if not user type - user must select
      participant_role: step.participant_role || 'approver',
      due_in_days: step.due_in_days || 3,
      order: idx + 1,
    };
  })
);
```

**Visual Indicators**:
- Bước chưa chọn người: Background màu vàng (`bg-amber-50`), border màu vàng (`border-amber-300`)
- Bước đã chọn người: Background trắng (`bg-white`), border xám (`border-gray-200`)
- Warning text: "⚠️ Vui lòng chọn người phê duyệt/ký"
- Tổng thể warning: Hiển thị số bước chưa chọn người

## Lợi ích

1. **User phải chọn rõ ràng**: Không có giá trị mặc định tự động, user phải chọn người cho mỗi bước
2. **UX tốt hơn**: Visual indicator rõ ràng cho các bước chưa hoàn thành
3. **Tránh lỗi**: Cảnh báo ngay khi có bước chưa chọn người, trước khi submit
4. **Đơn giản hóa**: Customized workflow chỉ hỗ trợ chọn user cụ thể, không phải department/role
5. **Minh bạch**: User biết chính xác ai sẽ phê duyệt/ký, không có "magic" auto-assignment

## Testing

### Test Case 1: Workflow với department approver
1. Chọn workflow có bước "Phê duyệt phòng ban" (approver_type = 'department')
2. Chuyển sang "Tùy chỉnh"
3. **Expected**: Bước được convert thành approver_type = 'user' với first user làm mặc định
4. User có thể chọn người khác từ dropdown

### Test Case 2: Workflow với role approver
1. Chọn workflow có bước "Phê duyệt quản lý" (approver_type = 'role')
2. Chuyển sang "Tùy chỉnh"
3. **Expected**: Bước được convert thành approver_type = 'user' với first user làm mặc định
4. User có thể chọn người khác từ dropdown

### Test Case 3: Workflow với null approver_id
1. Chọn workflow có bước với approver_id = null
2. Chuyển sang "Tùy chỉnh"
3. **Expected**: Bước có approver_id = first user ID
4. User có thể chọn người khác từ dropdown

## Files Changed

- `frontend/components/workflow/WorkflowCustomizer.tsx` - Fixed initialization logic

## Related Issues

- Document #76 (024/2025) - No approvers found
- Department ID 9 not found
- Role ID 16 not found

## Next Steps

1. ✅ Fix frontend initialization logic
2. ⏳ Test with real workflow
3. ⏳ Update existing broken workflows (optional cleanup)
4. ⏳ Add validation in backend to reject invalid approver_id

## Notes

- Customized workflow mode is designed for **simple user selection**
- If you need complex approval logic (department manager, role-based), use **fixed workflow** mode
- Template workflows can have department/role approvers, but customized workflows convert them to user approvers
