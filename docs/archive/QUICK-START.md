# 🚀 WP Sign - Quick Start

## 1️⃣ Khởi động Backend (5 phút)

```bash
cd backend

# Cài dependencies (nếu chưa)
npm install

# Tạo database và seed data
npx prisma db push
npx prisma db seed

# Khởi động server
npm run dev
```

✅ Backend chạy tại: http://localhost:4000

## 2️⃣ Test API ngay (2 phút)

### Cách 1: Dùng REST Client (Khuyến nghị)
1. Cài extension "REST Client" trong VS Code
2. Mở file `test-api.http`
3. Click "Send Request" ở dòng đầu tiên (Login)
4. Copy `accessToken` từ response
5. Paste vào dòng `@accessToken = ` ở đầu file
6. Test các endpoint khác

### Cách 2: Dùng Script tự động
```bash
cd backend
npx ts-node scripts/test-basic-flow.ts
```

### Cách 3: Dùng cURL
```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tenant1.com","password":"password123"}'
```

## 3️⃣ Cấu hình Email (Optional)

### Dev Mode (Mặc định)
Không cần làm gì. Email sẽ hiện trong console log.

### Production Mode
Tạo file `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@wpsign.local
```

**Gmail:** Tạo App Password tại https://myaccount.google.com/apppasswords

## 4️⃣ Test Flow Ký Tài Liệu

1. **Login** → Lấy token
2. **Upload Document** → Lấy document_id
3. **Create Sign Request** → Lấy signer_id
4. **Send OTP** → Xem OTP trong console/email
5. **Sign Document** → Dùng OTP để ký
6. **Check Status** → Xem trạng thái "completed"

## 5️⃣ Khởi động Frontend (Optional)

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend chạy tại: http://localhost:3000

Login với:
- Email: `admin@tenant1.com`
- Password: `password123`

## 📚 Tài liệu chi tiết

- [README-TESTING.md](README-TESTING.md) - Hướng dẫn test đầy đủ
- [docs/testing-guide.md](docs/testing-guide.md) - Test scenarios
- [docs/email-setup.md](docs/email-setup.md) - Cấu hình email
- [docs/api-spec.md](docs/api-spec.md) - API documentation

## 🎯 Test Accounts

```
Tenant 1:
- admin@tenant1.com / password123

Tenant 2:
- admin@tenant2.com / password123
```

## 🐛 Troubleshooting

**Backend không khởi động?**
- Kiểm tra PostgreSQL đang chạy
- Chạy `npx prisma generate`

**401 Unauthorized?**
- Token hết hạn (15 phút)
- Login lại để lấy token mới

**Email không gửi?**
- Dev mode: Xem console log
- Production: Kiểm tra SMTP config

## ✅ Checklist

- [ ] Backend chạy thành công
- [ ] Login được
- [ ] Upload document được
- [ ] Tạo sign request được
- [ ] Gửi OTP (xem console/email)
- [ ] Ký document với OTP
- [ ] Xem audit logs

## 🎉 Xong!

Bây giờ bạn có thể:
- Phát triển thêm features
- Tùy chỉnh UI
- Deploy lên production
- Tích hợp vào hệ thống của bạn

Happy coding! 🚀
