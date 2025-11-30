# Fix: Only Show Active Users in Selectors

## Vấn đề

Khi chọn người phê duyệt hoặc người ký, hệ thống hiển thị TẤT CẢ users bao gồm cả những người đã bị vô hiệu hóa (`status = 'disabled'` hoặc `status = 'pending'`).

Điều này gây ra:
- User có thể chọn người không còn hoạt động
- Workflow/signing bị stuck vì người được assign không thể login
- UX kém - danh sách dài với nhiều người không active

## Giải pháp

### Backend

**1. Thêm endpoint mới `/users/active`**:
```typescript
// users.controller.ts
async getActiveUsers(req: Request, res: Response) {
  try {
    const tenantId = (req as any).auth.tenantId;
    const users = await usersService.getActiveUsers(tenantId);
    res.json(users); // Return array directly
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// users.service.ts
async getActiveUsers(tenantId: number) {
  return usersRepository.findByTenant(tenantId, { status: 'active' });
}

// users.routes.ts
router.get('/active', requirePermission('users', 'read'), usersController.getActiveUsers);
```

**Endpoint**: `GET /api/v1/users/active`
- Chỉ trả về users có `status = 'active'`
- Không phân trang (dùng cho dropdown)
- Yêu cầu permission `users:read`

### Frontend

**2. Update các component sử dụng user selector**:

**WorkflowCustomizer.tsx**:
```typescript
// ❌ CŨ
const { data: usersData } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetchJson<any>('/users'),
});

// ✅ MỚI
const { data: usersData } = useQuery({
  queryKey: ['users', 'active'],
  queryFn: () => fetchJson<any>('/users/active'),
});
```

**InternalSignersSelector.tsx**:
```typescript
// ✅ MỚI
const { data: users } = useQuery({
  queryKey: ['users', 'active'],
  queryFn: async () => {
    const data = await fetchJson<any>('/users/active');
    return Array.isArray(data) ? data : [];
  },
});
```

## Lợi ích

1. **Chỉ hiển thị người active**: Dropdown chỉ có những người đang hoạt động
2. **Tránh lỗi workflow**: Không thể assign task cho người không active
3. **UX tốt hơn**: Danh sách ngắn gọn, dễ tìm
4. **Performance**: Ít data hơn, load nhanh hơn
5. **Bảo mật**: Người bị disable không xuất hiện trong hệ thống

## Testing

### Test Case 1: Active users only
1. Tạo 3 users: 1 active, 1 disabled, 1 pending
2. Mở workflow customizer
3. Click dropdown chọn người phê duyệt
4. **Expected**: Chỉ thấy 1 user (active)

### Test Case 2: Disabled user không xuất hiện
1. User A đang được assign trong workflow
2. Admin disable User A
3. Tạo document mới, chọn workflow
4. **Expected**: User A không xuất hiện trong dropdown

### Test Case 3: Backend validation
1. Gọi API `/users/active`
2. **Expected**: Response chỉ có users với `status = 'active'`

## Files Changed

- ✅ `backend/src/modules/users/users.controller.ts` - Added getActiveUsers
- ✅ `backend/src/modules/users/users.service.ts` - Added getActiveUsers
- ✅ `backend/src/modules/users/users.routes.ts` - Added /active route
- ✅ `frontend/components/workflow/WorkflowCustomizer.tsx` - Use /users/active
- ✅ `frontend/components/documents/InternalSignersSelector.tsx` - Use /users/active

## Related Issues

- Workflow với người disabled bị stuck
- Không thể phân biệt active/inactive users trong dropdown

## Notes

- Endpoint `/users` vẫn giữ nguyên (trả về tất cả users) cho trang quản lý users
- Endpoint `/users/active` dùng cho dropdowns/selectors
- Có thể mở rộng thêm filter khác: department, role, etc.
