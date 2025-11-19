# Quick Fix: 403 Forbidden - Thiếu Permissions

## Vấn đề
User hiện tại chưa có role Admin → Không có permissions → 403 Forbidden

## Giải pháp nhanh nhất

### Cách 1: Logout & Login lại (KHUYẾN NGHỊ)
1. Click "Đăng xuất" trong app
2. Login lại với `admin@acme.com` / `admin123`
3. Token mới sẽ có đầy đủ permissions

### Cách 2: Chạy SQL trực tiếp
```sql
-- Connect to database và chạy:
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@acme.com' 
  AND r.name = 'Admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );
```

### Cách 3: Tạm tắt permission check (Development only)
Comment out `requirePermission` trong routes:

```typescript
// backend/src/modules/documentTypes/documentTypes.routes.ts
router.get('/', /* requirePermission('documents', 'read'), */ documentTypesController.getDocumentTypes);
```

## Sau khi fix
- Refresh browser (F5)
- Vào /roles, /departments, /users
- Data sẽ hiển thị bình thường
- Tạo mới sẽ hoạt động

## Verify permissions
Sau khi login lại, check console:
```javascript
// Browser console
const session = JSON.parse(localStorage.getItem('esign.auth'));
console.log(session.user);
```

Nếu có role Admin → OK!
