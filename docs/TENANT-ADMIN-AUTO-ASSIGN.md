# Auto-Assign Admin Role for Tenant Creator

## 🎯 Tổng Quan

Khi user đăng ký và tạo tenant mới, sau khi được Super Admin phê duyệt, user đó sẽ **tự động trở thành Admin** của tenant mình tạo.

## ✅ Quy Trình

### 1. User Đăng Ký Tenant Mới
```
User vào /register
→ Chọn "Tạo workspace mới cho công ty của tôi"
→ Nhập tên công ty
→ Submit
→ Tenant mới được tạo
→ User status = 'pending'
```

### 2. Super Admin Phê Duyệt
```
Super Admin login
→ Vào /users
→ Thấy user pending từ tenant mới
→ Click "Phê duyệt"
```

### 3. Auto-Assign Logic
```typescript
// Kiểm tra xem user có phải first user trong tenant không
const usersInTenant = await prisma.users.count({
  where: { 
    tenant_id: user.tenant_id,
    status: { in: ['active', 'inactive'] }
  }
});

const isFirstUserInTenant = usersInTenant === 0;

// Nếu là first user → Admin, nếu không → User
const role = isFirstUserInTenant ? 'admin' : 'user';
```

### 4. Kết Quả
- ✅ User status → 'active'
- ✅ User role → 'admin' (nếu là first user)
- ✅ Gán RBAC role "Admin" với full permissions
- ✅ Tạo Admin role cho tenant nếu chưa có
- ✅ Gán tất cả 40 permissions
- ✅ Email thông báo gửi đến user

## 🔧 Implementation

### Backend: registration.service.ts

```typescript
async approveUser(userId: number, approvedBy: number) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { tenant: true }
  });

  // Check if first user in tenant
  const usersInTenant = await prisma.users.count({
    where: { 
      tenant_id: user.tenant_id,
      status: { in: ['active', 'inactive'] }
    }
  });

  const isFirstUserInTenant = usersInTenant === 0;

  // Update user
  await prisma.users.update({
    where: { id: userId },
    data: { 
      status: 'active',
      role: isFirstUserInTenant ? 'admin' : 'user'
    }
  });

  // Assign RBAC role
  const roleName = isFirstUserInTenant ? 'Admin' : 'User';
  let defaultRole = await prisma.roles.findFirst({
    where: {
      tenant_id: user.tenant_id,
      name: roleName
    }
  });

  // Create Admin role if doesn't exist
  if (!defaultRole && isFirstUserInTenant) {
    defaultRole = await prisma.roles.create({
      data: {
        name: 'Admin',
        description: 'Administrator with full access',
        tenant_id: user.tenant_id
      }
    });

    // Assign all permissions
    const allPermissions = await prisma.permissions.findMany();
    for (const permission of allPermissions) {
      await prisma.role_permissions.create({
        data: {
          role_id: defaultRole.id,
          permission_id: permission.id
        }
      });
    }
  }

  // Assign role to user
  await prisma.user_roles.create({
    data: {
      user_id: userId,
      role_id: defaultRole.id
    }
  });
}
```

## 🎭 Roles & Permissions

### Admin Role (First User)
- **Legacy Role**: `admin`
- **RBAC Role**: `Admin`
- **Permissions**: 40 permissions (full access)
- **Capabilities**:
  - Quản lý users trong tenant
  - Phê duyệt/từ chối đăng ký mới
  - Tạo/sửa/xóa documents, workflows, departments, etc.
  - Full access to tenant features

### User Role (Subsequent Users)
- **Legacy Role**: `user`
- **RBAC Role**: `User`
- **Permissions**: Limited permissions
- **Capabilities**:
  - Xem documents được share
  - Tạo documents
  - Submit for approval
  - Limited access

## 🔍 Kiểm Tra

### Script: Check User Role
```bash
cd backend
node scripts/check-user-role.js <email>
```

**Output:**
```
👤 User Information:
Name: Van Nguyễn
Email: vanqn95@gmail.com
Status: active
Legacy Role: admin
Tenant: ét ô ét (ID: 2)

🎭 RBAC Roles:
1. Admin
   Description: Administrator with full access
   Permissions: 40

🎯 Summary:
Is Admin: ✅ YES
Can manage tenant: ✅ YES
Full access: ✅ YES
```

### Script: Make Existing User Admin
```bash
cd backend
node scripts/make-tenant-admin.js <email>
```

## 🆚 Super Admin vs Tenant Admin

| Feature | Super Admin | Tenant Admin |
|---------|-------------|--------------|
| Xem users | ✅ All tenants | ⚠️ Own tenant only |
| Phê duyệt users | ✅ All tenants | ⚠️ Own tenant only |
| Xóa users | ✅ All tenants | ⚠️ Own tenant only |
| Quản lý documents | ✅ All tenants | ⚠️ Own tenant only |
| Tạo tenant | ✅ Yes | ❌ No |
| Xóa tenant | ✅ Yes | ❌ No |

## 📋 Use Cases

### Use Case 1: Công ty mới đăng ký
```
1. CEO công ty ABC đăng ký
2. Chọn "Tạo workspace mới"
3. Nhập tên: "Công ty ABC"
4. Super Admin phê duyệt
5. CEO tự động trở thành Admin của "Công ty ABC"
6. CEO có thể mời nhân viên vào tenant
```

### Use Case 2: Nhân viên tham gia tenant có sẵn
```
1. Nhân viên đăng ký
2. KHÔNG chọn "Tạo workspace mới"
3. Super Admin phê duyệt
4. Nhân viên trở thành User (không phải Admin)
5. Admin của tenant có thể nâng cấp role sau
```

### Use Case 3: User thứ 2 trong tenant mới
```
1. User A tạo tenant "XYZ Corp" → Trở thành Admin
2. User B đăng ký vào "XYZ Corp" → Trở thành User
3. Admin (User A) có thể nâng User B lên Admin nếu cần
```

## 🔧 Scripts

### 1. Check New Tenants
```bash
node backend/scripts/check-new-tenant.js
```

### 2. Check User Role
```bash
node backend/scripts/check-user-role.js <email>
```

### 3. Make User Admin
```bash
node backend/scripts/make-tenant-admin.js <email>
```

### 4. Create Super Admin
```bash
node backend/scripts/create-super-admin.js
```

## ⚠️ Lưu Ý

1. **Chỉ first user được auto-assign Admin**
   - Users tiếp theo sẽ là User role
   - Admin có thể promote sau

2. **Admin role được tạo tự động**
   - Nếu tenant mới chưa có Admin role
   - Tự động tạo với full permissions

3. **Không thể downgrade first admin**
   - Nên giữ ít nhất 1 admin trong tenant
   - Tránh tình trạng tenant không có admin

4. **Super Admin khác với Tenant Admin**
   - Super Admin: Quản lý toàn hệ thống
   - Tenant Admin: Quản lý tenant của mình

## 🔗 Related Files

**Backend:**
- `backend/src/modules/auth/registration.service.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`

**Scripts:**
- `backend/scripts/check-user-role.js`
- `backend/scripts/make-tenant-admin.js`
- `backend/scripts/check-new-tenant.js`

**Documentation:**
- `docs/SUPER-ADMIN-GUIDE.md`
- `docs/USER-APPROVAL-GUIDE.md`
- `docs/TENANT-REGISTRATION-GUIDE.md`
