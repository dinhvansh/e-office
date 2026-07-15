# Super Admin Guide

## 🎯 Tổng Quan

**Super Admin** là tài khoản đặc biệt có quyền quản lý **tất cả tenants** trong hệ thống, bao gồm:
- Xem users từ mọi workspace/tenant
- Phê duyệt/từ chối đăng ký từ bất kỳ tenant nào
- Quản lý cross-tenant

## 🔐 Thông Tin Super Admin

```
Email:    superadmin@example.local
Password: set during provisioning (no default)
Role:     super_admin
```

## ✅ Quyền Hạn Super Admin

### 1. Xem Tất Cả Users
- Super Admin thấy users từ **TẤT CẢ tenants**
- Admin thường chỉ thấy users trong tenant của mình

### 2. Phê Duyệt Cross-Tenant
- Có thể phê duyệt user đăng ký từ bất kỳ tenant nào
- Không bị giới hạn bởi tenant isolation

### 3. Quản Lý Toàn Hệ Thống
- Full access vào tất cả tính năng
- Có thể can thiệp vào mọi tenant

## 🆚 So Sánh: Super Admin vs Admin

| Tính năng | Super Admin | Admin (Tenant) |
|-----------|-------------|----------------|
| Xem users | ✅ Tất cả tenants | ⚠️ Chỉ tenant của mình |
| Phê duyệt users | ✅ Mọi tenant | ⚠️ Chỉ tenant của mình |
| Quản lý documents | ✅ Tất cả | ⚠️ Chỉ tenant của mình |
| Tạo tenant mới | ✅ Có | ❌ Không |
| Xóa tenant | ✅ Có | ❌ Không |

## 📋 Cách Sử Dụng

### 1. Đăng Nhập Super Admin
```
URL: http://localhost:3000/login
Email: superadmin@example.local
Password: set during provisioning (no default)
```

### 2. Xem Tất Cả Users
1. Vào: `http://localhost:3000/users`
2. Bạn sẽ thấy users từ **TẤT CẢ tenants**
3. Cột **"Workspace"** hiển thị tenant của mỗi user

### 3. Phê Duyệt User Từ Tenant Khác
1. Lọc "Chờ duyệt" hoặc tìm user
2. Xem cột "Workspace" để biết user thuộc tenant nào
3. Click "Phê duyệt" hoặc "Từ chối"
4. User sẽ nhận email thông báo

## 🔧 Tạo Super Admin

### Cách 1: Chạy Script
```bash
cd backend
node scripts/create-super-admin.js
```

### Cách 2: Update User Hiện Tại
```sql
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'superadmin@example.local';
```

### Cách 3: Tạo Mới Qua Script
```javascript
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const passwordHash = await bcrypt.hash('your-password', 10);
  
  await prisma.users.create({
    data: {
      email: 'superadmin@example.com',
      password_hash: passwordHash,
      full_name: 'Super Administrator',
      tenant_id: 1,
      status: 'active',
      role: 'super_admin'
    }
  });
}
```

## 🎨 UI Differences

### Super Admin View
```
┌─────────────────────────────────────────┐
│ Quản lý người dùng                      │
├─────────────────────────────────────────┤
│ User          │ Workspace  │ Status     │
├─────────────────────────────────────────┤
│ Alex Example  │ Example Org│ ⏳ Pending │
│ Jordan Example│ Example Org│ ✅ Active  │
│ Taylor Example│ Example Org│ ✅ Active  │
└─────────────────────────────────────────┘
```

### Regular Admin View
```
┌─────────────────────────────────────────┐
│ Quản lý người dùng                      │
├─────────────────────────────────────────┤
│ User          │ Workspace  │ Status     │
├─────────────────────────────────────────┤
│ Jordan Example│ Example Org│ ✅ Active  │
│ Taylor Example│ Example Org│ ✅ Active  │
└─────────────────────────────────────────┘
(Chỉ thấy users trong Example Org)
```

## 🔍 Kiểm Tra Super Admin

### Script Check
```bash
cd backend
node scripts/check-new-tenant.js
```

### Kiểm Tra Database
```sql
SELECT id, email, role, tenant_id 
FROM users 
WHERE role = 'super_admin';
```

### Kiểm Tra Qua API
```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.local","password":"<provisioned-password>"}'

# Get all users (with token)
curl http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ⚠️ Lưu Ý Bảo Mật

1. **Giới hạn số lượng Super Admin**
   - Chỉ nên có 1-2 super admin
   - Không tạo quá nhiều

2. **Mật khẩu mạnh**
   - Đổi mật khẩu mặc định ngay
   - Sử dụng password manager

3. **Audit Log**
   - Theo dõi hành động của super admin
   - Log mọi thay đổi cross-tenant

4. **2FA (Future)**
   - Nên bật 2FA cho super admin
   - Tăng cường bảo mật

## 🚀 Use Cases

### Use Case 1: Phê Duyệt Tenant Mới
```
1. User đăng ký với tenant mới "Company XYZ"
2. Super Admin nhận email thông báo
3. Super Admin login → vào /users
4. Thấy user pending từ "Company XYZ"
5. Phê duyệt → User trở thành admin của tenant mới
```

### Use Case 2: Hỗ Trợ Tenant Khác
```
1. Tenant "ABC Corp" báo lỗi
2. Super Admin login
3. Xem users của "ABC Corp"
4. Kiểm tra và fix vấn đề
```

### Use Case 3: Quản Lý Multi-Tenant
```
1. Super Admin xem tổng quan tất cả tenants
2. Theo dõi số lượng users mỗi tenant
3. Quản lý tài nguyên hệ thống
```

## 📊 Technical Details

### Backend Logic
```typescript
// registration.controller.ts
const isSuperAdmin = user?.role === 'super_admin' || 
                     user?.email === 'admin@acme.local';

const users = await registrationService.getPendingUsers(
  isSuperAdmin ? null : tenantId
);
```

### Database Schema
```sql
users {
  id: number
  email: string
  role: string  -- 'super_admin' | 'admin' | 'user'
  tenant_id: number
  status: string
}
```

### API Endpoints
```
GET  /api/v1/users          # Super admin sees all
GET  /api/v1/users/pending  # Super admin sees all pending
POST /api/v1/users/:id/approve
POST /api/v1/users/:id/reject
```

## 🔗 Related Files

**Backend:**
- `backend/src/modules/auth/registration.controller.ts`
- `backend/src/modules/auth/registration.service.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/users.repository.ts`

**Frontend:**
- `frontend/app/(dashboard)/users/page.tsx`

**Scripts:**
- `backend/scripts/create-super-admin.js`
- `backend/scripts/check-new-tenant.js`

**Documentation:**
- `docs/USER-APPROVAL-GUIDE.md`
- `docs/TENANT-REGISTRATION-GUIDE.md`
- `docs/SECURITY.md`

## 💡 Best Practices

1. **Tạo Super Admin ngay sau setup**
2. **Đổi password mặc định**
3. **Giới hạn số lượng super admin**
4. **Log tất cả hành động**
5. **Regular security audit**
6. **Backup database thường xuyên**

## 🆘 Troubleshooting

### Không thấy users từ tenant khác?
- Kiểm tra role: `SELECT role FROM users WHERE email = 'admin@acme.local'`
- Phải là `super_admin`, không phải `admin`
- Chạy: `node scripts/create-super-admin.js`

### Không phê duyệt được?
- Kiểm tra permissions
- Xem logs backend
- Verify token còn hạn

### Email không gửi?
- Kiểm tra SMTP config
- Test: `node backend/scripts/test-real-email.js`
