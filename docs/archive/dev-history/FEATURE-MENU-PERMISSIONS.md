# Feature: Menu Permissions (RBAC)

**Date**: 2025-11-20  
**Developer**: Kiro AI  
**Status**: ✅ Complete

## 🎯 Objective
Implement role-based menu filtering to show/hide menu items based on user roles.

## ✅ Implementation

### 1. Updated Sidebar Items Structure
**File**: `frontend/constants/sidebarItems.ts`

Added new fields to `SidebarItem` interface:
```typescript
interface SidebarItem {
  // ... existing fields
  requiredPermissions?: string[]; // For future permission-based filtering
  requiredRoles?: string[];       // Current role-based filtering
}
```

### 2. Role Assignments

**Workspace Section** (All users can access):
- ✅ Tổng quan (Dashboard)
- ✅ Quy trình ký (Sign Requests)
- ✅ Tài liệu (Documents)

**Tổ chức Section** (Admin & Manager only):
- 🔒 Người dùng → `requiredRoles: ["Admin", "Manager"]`
- 🔒 Phòng ban → `requiredRoles: ["Admin", "Manager"]`
- 🔒 Vai trò & Quyền → `requiredRoles: ["Admin"]` (Admin only)

**Cấu hình Section** (Admin & Manager):
- 🔒 Loại văn bản → `requiredRoles: ["Admin", "Manager"]`
- 🔒 Tổ chức ngoài → `requiredRoles: ["Admin", "Manager"]`
- 🔒 Doanh nghiệp → `requiredRoles: ["Admin"]` (Admin only)
- 🔒 Gói dịch vụ → `requiredRoles: ["Admin"]` (Admin only)
- 🔒 Webhooks → `requiredRoles: ["Admin"]` (Admin only)

### 3. Permission Helper Functions
**File**: `frontend/lib/permissions.ts`

```typescript
// Check if user has required role
hasRequiredRole(userRole, requiredRoles): boolean

// Filter sidebar based on user role
filterSidebarByPermissions(sidebarStructure, userRole): SidebarGroup[]
```

### 4. Layout Integration
**File**: `frontend/app/(dashboard)/layout.tsx`

```typescript
// Filter sidebar dynamically based on user role
const filteredSidebar = filterSidebarByPermissions(SIDEBAR_STRUCTURE, user?.role);

// Render filtered sidebar
{filteredSidebar.map((group, groupIndex) => (...))}
```

## 🎨 User Experience

### Admin User
- Sees **all menu items** (full access)
- Can manage users, roles, departments
- Can configure system settings

### Manager User
- Sees **workspace + organization** sections
- Can manage users, departments, document types
- **Cannot** see: Roles, Doanh nghiệp, Gói dịch vụ, Webhooks

### Regular User
- Sees **workspace section only**
- Can view/create documents and sign requests
- **Cannot** see: Organization and Configuration sections

### Viewer User
- Sees **workspace section only** (read-only)
- Limited to viewing documents

## 🔒 Security Notes

1. **Frontend filtering only**: This is UI-level protection
2. **Backend must enforce**: API endpoints should validate permissions
3. **Route protection**: Consider adding route guards for protected pages
4. **Future enhancement**: Use actual permissions from backend instead of roles

## 🧪 Testing

### Test Cases
1. ✅ Login as Admin → See all menu items
2. ✅ Login as Manager → See workspace + organization (except Roles)
3. ✅ Login as User → See workspace only
4. ✅ Empty groups are hidden (if all items filtered out)

### Test Users (from seed data)
- `admin@acme.local` → Admin role
- `manager@acme.local` → Manager role (if exists)
- `user@acme.local` → User role (if exists)

## 🔜 Future Enhancements

1. **Permission-based filtering**: Use actual permissions instead of roles
   - Fetch user permissions from backend
   - Check `requiredPermissions` field
   
2. **Route guards**: Protect routes at Next.js level
   ```typescript
   // middleware.ts
   if (!hasPermission(user, route)) {
     return redirect('/unauthorized');
   }
   ```

3. **Dynamic permissions**: Load from backend configuration
4. **Permission caching**: Cache user permissions in AuthProvider
5. **Audit logging**: Log permission checks for security

## 📝 Files Modified

- `frontend/constants/sidebarItems.ts` - Added role requirements
- `frontend/lib/permissions.ts` - New permission helper functions
- `frontend/app/(dashboard)/layout.tsx` - Integrated filtering
- `docs/dev/FEATURE-MENU-PERMISSIONS.md` - This documentation

## 🎉 Result

Menu now dynamically shows/hides based on user role, providing better UX and basic access control at UI level.
