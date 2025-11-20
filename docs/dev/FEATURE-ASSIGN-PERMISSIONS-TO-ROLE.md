# Feature: Assign Permissions to Role

**Date**: 2025-11-20  
**Status**: ✅ Complete

## 🎯 Objective
Allow users to assign/manage permissions when creating or editing a role.

## ✅ Implementation

### Frontend Changes

**File**: `frontend/app/(dashboard)/roles/page.tsx`

**1. Fetch All Permissions**
```typescript
const { data: allPermissions } = useQuery({
  queryKey: ['all-permissions'],
  queryFn: () => fetchJson<any>('/roles/permissions'),
});
```

**2. State Management**
```typescript
const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
```

**3. Permission Checkboxes in Form**
- Grouped by resource (documents, users, roles, etc.)
- Checkbox for each permission
- Counter showing selected permissions
- Scrollable list (max-h-60)

**4. Form Submit**
```typescript
createRoleMutation.mutate({
  ...formData,
  permission_ids: selectedPermissions
});
```

**5. Edit Role**
- Load existing permissions when editing
- Pre-check checkboxes for assigned permissions

## 🎨 UI Features

### Create Role
1. Click "Tạo vai trò mới"
2. Fill name & description
3. Select permissions (grouped by resource)
4. See counter: "Đã chọn: X quyền"
5. Submit → Role created with permissions

### Edit Role
1. Click Edit button on role card
2. Form opens with:
   - Name & description pre-filled
   - Permissions pre-checked
3. Modify permissions
4. Submit → Role updated

### Permission List
- **Grouped by resource**: documents, users, roles, etc.
- **Vietnamese labels**: "Tài liệu", "Người dùng", etc.
- **Scrollable**: max-h-60 overflow-y-auto
- **Interactive**: Hover effects on checkboxes

## 📋 Backend API

**Endpoint**: Already exists
- `GET /api/v1/roles/permissions` - Get all permissions
- `POST /api/v1/roles` - Create with `permission_ids`
- `PUT /api/v1/roles/:id` - Update with `permission_ids`

## 🧪 Testing

Test cases:
- ✅ Create role without permissions → Success
- ✅ Create role with permissions → Success
- ✅ Edit role and add permissions → Success
- ✅ Edit role and remove permissions → Success
- ✅ Permissions grouped correctly → Success
- ✅ Counter shows correct number → Success

## 💡 UX Improvements

1. **Grouped permissions**: Easier to find and select
2. **Counter**: Shows how many permissions selected
3. **Pre-checked on edit**: User sees current state
4. **Scrollable list**: Doesn't overflow dialog
5. **Reset on close**: Clean state when reopening

## 📝 Files Modified

- `frontend/app/(dashboard)/roles/page.tsx`
  - Added `allPermissions` query
  - Added `selectedPermissions` state
  - Added permission checkboxes UI
  - Updated form submit logic
  - Updated edit button logic
  - Updated create button logic

## 🎉 Result

Users can now:
- ✅ Create role with permissions in one step
- ✅ Edit role and modify permissions
- ✅ See grouped permissions by resource
- ✅ Know how many permissions selected
- ✅ Remove individual permissions (previous feature)

**Complete RBAC management UI!** 🚀
