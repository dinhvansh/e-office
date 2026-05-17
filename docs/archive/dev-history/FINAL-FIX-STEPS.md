# 🎯 FINAL FIX STEPS - Invalid Token

## ✅ Đã hoàn thành
- ✅ localStorage cleared (Playwright test passed)
- ✅ Database running (PostgreSQL + Redis)
- ✅ Backend running (port 4000)
- ✅ Frontend running (port 3000)
- ✅ Type fixed (TenantProfile.domain added)

## ⚠️ VẤN ĐỀ HIỆN TẠI
Browser của bạn vẫn đang dùng **token cũ đã hết hạn** trong memory/cache.

## 🔧 GIẢI PHÁP (Chọn 1 trong 3)

### Option 1: Hard Refresh (Nhanh nhất)
1. **Đóng TẤT CẢ tab** đang mở localhost:3000
2. Mở **tab mới**
3. Vào http://localhost:3000
4. Login: `admin@acme.local / secret123`

### Option 2: Incognito Mode (Đảm bảo 100%)
1. Mở **Incognito/Private window** (Ctrl+Shift+N)
2. Vào http://localhost:3000
3. Login: `admin@acme.local / secret123`

### Option 3: Clear trong DevTools
1. Mở http://localhost:3000
2. F12 → Console
3. Chạy:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```
4. Login: `admin@acme.local / secret123`

## 🧪 Verify Backend hoạt động
```powershell
# Test login API
$body = '{"email":"admin@acme.local","password":"secret123"}'
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## 📊 Current Status
```
✅ Database:  Running
✅ Backend:   Running (port 4000)
✅ Frontend:  Running (port 3000)
⚠️  Browser:  Cần clear cache/reload
```

## 🎯 Expected Result
Sau khi làm theo 1 trong 3 options trên:
- ✅ Login thành công
- ✅ Redirect về dashboard
- ✅ Không còn lỗi "Invalid token"
- ✅ Có thể truy cập Documents, Document Types, etc.

## 🐛 Debug
Nếu vẫn lỗi, check console logs:
```javascript
// Xem token hiện tại
const auth = localStorage.getItem('esign.auth');
console.log(auth);

// Nếu có token, decode để xem expiry
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

const data = JSON.parse(auth);
if (data.tokens) {
  const payload = parseJwt(data.tokens.accessToken);
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Is expired:', Date.now() > payload.exp * 1000);
}
```

---

**TL;DR**: Đóng tất cả tab browser → Mở tab mới → Login lại
