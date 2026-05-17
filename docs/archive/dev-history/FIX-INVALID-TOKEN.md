# Fix Invalid Token Error

## ⚠️ QUAN TRỌNG: Default Credentials
```
Email: admin@acme.local
Password: secret123
```

## Vấn đề
Lỗi "Invalid token" xảy ra khi:
- Token đã hết hạn (access token có thời hạn 15 phút)
- Token trong localStorage bị lỗi hoặc không hợp lệ
- Backend restart với JWT_SECRET khác
- Đang dùng credentials cũ (admin@tenant1.local / password123)

## Giải pháp

### Cách 1: Clear localStorage qua Browser DevTools
1. Mở browser DevTools (F12)
2. Vào tab **Application** (Chrome) hoặc **Storage** (Firefox)
3. Chọn **Local Storage** → `http://localhost:3000`
4. Xóa key `esign.auth`
5. Refresh trang và login lại

### Cách 2: Dùng Clear Storage Page
1. Truy cập: http://localhost:3000/clear-storage.html
2. Click nút **Clear All Storage**
3. Quay lại trang chủ và login lại

### Cách 3: Clear qua Console
1. Mở browser console (F12 → Console)
2. Chạy lệnh:
```javascript
localStorage.clear();
location.reload();
```

## Kiểm tra Backend Logs
Backend đã được thêm logging chi tiết:
```
[AUTH] Token verification failed: { error: '...', tokenPreview: '...' }
```

Frontend cũng có logging:
```
[Auth] Got 401, attempting token refresh...
[Auth] Token refreshed successfully
```

## Test Auth Flow
Chạy test để verify auth hoạt động đúng:
```bash
# Test qua REST Client (VS Code)
# Mở file: test-api.http
# Chạy các request theo thứ tự:
# 1. POST Login
# 2. GET Documents (với token từ bước 1)
# 3. POST Refresh Token
```

## Nguyên nhân thường gặp

### 1. Token hết hạn
- Access token: 15 phút
- Refresh token: 7 ngày
- Frontend tự động refresh khi access token hết hạn
- Nếu refresh token cũng hết hạn → phải login lại

### 2. Backend restart
- Nếu backend restart với JWT_SECRET khác → tất cả token cũ invalid
- Giải pháp: Clear localStorage và login lại

### 3. Clock skew
- Nếu thời gian server và client lệch nhiều → token có thể bị reject
- Kiểm tra: `date` (Linux/Mac) hoặc `Get-Date` (Windows)

## Cải tiến đã thực hiện

### Backend (auth.service.ts)
- Thêm logging chi tiết khi verify token fail
- Log token preview để debug

### Frontend (auth-provider.tsx)
- Thêm logging cho refresh flow
- Cải thiện error handling (không logout khi network error)
- Log rõ ràng khi 401 và retry

## Debug Tips

### Xem token trong localStorage
```javascript
const auth = JSON.parse(localStorage.getItem('esign.auth'));
console.log('Access Token:', auth.tokens.accessToken);
console.log('Refresh Token:', auth.tokens.refreshToken);
```

### Decode JWT token
```javascript
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

const auth = JSON.parse(localStorage.getItem('esign.auth'));
const payload = parseJwt(auth.tokens.accessToken);
console.log('Token payload:', payload);
console.log('Expires at:', new Date(payload.exp * 1000));
console.log('Is expired:', Date.now() > payload.exp * 1000);
```

## Kết luận
Lỗi invalid token thường do token hết hạn hoặc localStorage bị lỗi. Giải pháp đơn giản nhất là clear localStorage và login lại.
