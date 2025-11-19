# 🔧 Quick Fix: Invalid Token Error

## TL;DR
1. Mở http://localhost:3000/clear-storage.html
2. Click "Clear All Storage"
3. Login lại với:
   - Email: `admin@acme.local`
   - Password: `secret123`

## Chi tiết

### Nguyên nhân
- Token cũ đã hết hạn (15 phút)
- Credentials cũ không đúng (admin@tenant1.local)
- localStorage bị lỗi

### Giải pháp nhanh

**Option 1: Clear Storage Page**
```
http://localhost:3000/clear-storage.html
```

**Option 2: Browser Console**
```javascript
localStorage.clear();
location.reload();
```

**Option 3: DevTools**
- F12 → Application → Local Storage
- Xóa key `esign.auth`
- Refresh page

### Default Credentials
```
Email: admin@acme.local
Password: secret123
```

### Verify Backend
```powershell
# Test login
$body = '{"email":"admin@acme.local","password":"secret123"}'
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
```

### List Users
```bash
cd backend
node scripts/list-users.js
```

## Đã fix
✅ Backend logging chi tiết
✅ Frontend auto-refresh token
✅ Clear storage helper page
✅ Better error messages
✅ Credentials documented

## Xem thêm
- `docs/dev/FIX-INVALID-TOKEN.md` - Chi tiết đầy đủ
- `test-api.http` - Test API endpoints
- `README-TESTING.md` - Testing guide
