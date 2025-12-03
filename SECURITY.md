# Hướng Dẫn Bảo Mật

## 🔐 Thông Tin Đăng Nhập Mặc Định

**⚠️ QUAN TRỌNG**: Thông tin đăng nhập mặc định chỉ dùng cho lần đầu cài đặt.

### Tài Khoản Admin Mặc Định

```
Email:    admin@acme.local
Password: secret123
```

## ✅ Checklist Bảo Mật Sau Khi Cài Đặt

### 1. Đổi Mật Khẩu Admin Ngay Lập Tức
- [ ] Đăng nhập với tài khoản admin mặc định
- [ ] Vào **Settings** → **Change Password**
- [ ] Đặt mật khẩu mạnh (tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt)
- [ ] Lưu mật khẩu mới vào password manager

### 2. Cấu Hình JWT Secret
```bash
cd backend
# Tạo JWT secret mạnh
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Cập nhật trong `backend/.env`:
```env
JWT_SECRET=<your-generated-secret>
```

### 3. Cấu Hình Database
- [ ] Đổi password PostgreSQL mặc định
- [ ] Giới hạn kết nối database chỉ từ localhost (production)
- [ ] Backup database định kỳ

### 4. Cấu Hình CORS
Trong `backend/.env`:
```env
CORS_ORIGIN=https://yourdomain.com
```

### 5. HTTPS (Production)
- [ ] Cài đặt SSL certificate (Let's Encrypt)
- [ ] Cấu hình Nginx/Apache với HTTPS
- [ ] Redirect HTTP → HTTPS
- [ ] Cấu hình HSTS headers

### 6. Rate Limiting
Backend đã có rate limiting mặc định:
- Login: 5 requests/15 phút
- API: 100 requests/15 phút

Điều chỉnh trong `backend/src/app.ts` nếu cần.

### 7. Xóa Tài Khoản Test
```bash
cd backend
node scripts/remove-test-accounts.js
```

### 8. Environment Variables
- [ ] Không commit file `.env` vào git
- [ ] Sử dụng `.env.example` làm template
- [ ] Lưu trữ secrets an toàn (AWS Secrets Manager, Azure Key Vault, etc.)

### 9. Logs & Monitoring
- [ ] Cấu hình log rotation
- [ ] Monitor failed login attempts
- [ ] Thiết lập alerts cho suspicious activities

### 10. Backup
- [ ] Backup database hàng ngày
- [ ] Backup uploaded files
- [ ] Test restore process

## 🚨 Trong Trường Hợp Khẩn Cấp

### Reset Admin Password
```bash
cd backend
node scripts/reset-admin-password.js
```

### Revoke All Sessions
```bash
# Thay đổi JWT_SECRET trong .env
# Restart backend
npm run dev
```

## 📋 Security Checklist cho Production

- [ ] Đổi tất cả passwords mặc định
- [ ] Cấu hình JWT_SECRET mạnh
- [ ] Enable HTTPS
- [ ] Cấu hình CORS đúng domain
- [ ] Giới hạn database access
- [ ] Enable firewall
- [ ] Cấu hình rate limiting
- [ ] Setup monitoring & alerts
- [ ] Regular security updates
- [ ] Backup strategy
- [ ] Incident response plan

## 🔗 Tài Liệu Liên Quan

- [INSTALL.md](./INSTALL.md) - Hướng dẫn cài đặt
- [docs/DEPLOYMENT-GUIDE.md](./docs/DEPLOYMENT-GUIDE.md) - Hướng dẫn deploy production
- [backend/.env.example](./backend/.env.example) - Environment variables template

## 📞 Liên Hệ

Nếu phát hiện lỗ hổng bảo mật, vui lòng liên hệ ngay với team phát triển.
