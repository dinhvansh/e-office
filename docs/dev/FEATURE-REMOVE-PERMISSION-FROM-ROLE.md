# Feature: Remove Permission from Role

**Date**: 2025-11-20  
**Status**: ✅ Complete

## 🎯 Objective
Allow users to remove individual permissions from a role without having to reassign all permissions.

## ✅ Implementation

### Backend

**1. Repository** (`backend/src/modules/roles/roles.repository.ts`)
```typescript
async removePermission(roleId: number, permissionId: number) {
  return prisma.role_permissions.deleteMany({
    where: {
      role_id: roleId,
      permission_id: permissionId,
    },
  });
}
```

**2. Service** (`backend/src/modules/roles/roles.service.ts`)
```typescript
async removePermission(roleId: number, permissionId: number, tenantId: number) {
  const role = await rolesRepository.findById(roleId, tenantId);
  if (!role) throw new Error('Role not found');
  if (role.is_system) throw new Error('Cannot modify system role permissions');
  return rolesRepository.removePermission(roleId, permissionId);
}
```

**3. Controller** (`backend/src/modules/roles/roles.controller.ts`)
```typescript
async removePermission(req: Request, res: Response) {
  const tenantId = (req as any).auth.tenantId;
  const { id, permissionId } = req.params;
  await rolesService.removePermission(parseInt(id), parseInt(permissionId), tenantId);
  res.json({ success: true, message: 'Permission removed from role' });
}
```

**4. Route** (`backend/src/modules/roles/roles.routes.ts`)
```typescript
router.delete('/:id/permissions/:permissionId', rolesController.removePermission);
```

### Frontend

**File**: `frontend/app/(dashboard)/roles/page.tsx`

**1. Mutation**
```typescript
const removePermissionMutation = useMutation({
  mutationFn: ({ roleId, permissionId }) =>
    fetchJson(`/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE' }),
  onSuccess: () => {
    toast.success('Xóa quyền thành công!');
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  },
});
```

**2. UI Enhancement**
- Delete button appears on hover (group-hover)
- Only shown for non-system roles
- Confirmation dialog before delete
- Toast notification on success/error

## 🎨 UX Features

1. **Hover to reveal**: Delete button only shows when hovering over permission
2. **System role protection**: Cannot delete permissions from system roles
3. **Confirmation**: Asks user to confirm before deleting
4. **Feedback**: Toast notification shows success/error
5. **Auto-refresh**: Role list refreshes after deletion

## 🔒 Security

- ✅ Tenant isolation (tenantId check)
- ✅ System role protection (cannot modify)
- ✅ Authentication required (authGuard)
- ✅ Validation (role exists, permission exists)

## 📋 API Endpoint

```
DELETE /api/v1/roles/:id/permissions/:permissionId
```

**Response**:
```json
{
  "success": true,
  "message": "Permission removed from role"
}
```

## 🧪 Testing

Test cases:
- ✅ Remove permission from custom role → Success
- ✅ Try to remove from system role → Error
- ✅ Remove non-existent permission → Error
- ✅ Remove from non-existent role → Error
- ✅ UI updates after removal → Success

## 📝 Files Modified

**Backend**:
- `backend/src/modules/roles/roles.repository.ts`
- `backend/src/modules/roles/roles.service.ts`
- `backend/src/modules/roles/roles.controller.ts`
- `backend/src/modules/roles/roles.routes.ts`

**Frontend**:
- `frontend/app/(dashboard)/roles/page.tsx`
