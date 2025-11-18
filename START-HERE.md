# 👋 Chào mừng đến với WP Sign!

## 🎉 Bạn đã có gì?

✅ **Backend API hoàn chỉnh** với 9 modules  
✅ **Email service** tích hợp nodemailer  
✅ **Frontend UI** với Next.js + TailwindCSS  
✅ **Testing tools** đầy đủ  
✅ **Documentation** chi tiết  

## ⚡ Cách nhanh nhất

```cmd
npm install
npm run dev
```

Cả backend và frontend sẽ chạy cùng lúc! → **[RUN-BOTH.md](RUN-BOTH.md)**

---

## 🚀 Hoặc chạy từng bước (3 bước)

### ⚠️ Quan trọng: Dùng CMD, không dùng PowerShell!

Nếu gặp lỗi `npm.ps1 cannot be loaded` → **[RUN-NOW.md](RUN-NOW.md)** ⭐

### Bước 1: Khởi động Backend (2 phút)

**Mở CMD (Command Prompt):**
```cmd
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

✅ Backend chạy tại: http://localhost:4000

### Bước 2: Test API (1 phút)

**Cách nhanh nhất:**
```cmd
cd backend
npx ts-node scripts/test-basic-flow.ts
```

Script sẽ tự động test:
- Login ✅
- Upload document ✅
- Create sign request ✅
- Send OTP ✅
- Sign document ✅
- Check status ✅

**Hoặc dùng REST Client:**
1. Cài extension "REST Client" trong VS Code
2. Mở file `test-api.http`
3. Click "Send Request" ở mỗi endpoint

### Bước 3: Xem kết quả

**Console log sẽ hiển thị:**
```
🚀 Bắt đầu test các chức năng cơ bản của WP Sign
=================================================

🔐 Test 1: Login
================
✅ Login thành công
   User ID: 1
   Tenant ID: 1

📄 Test 2: Upload Document
===========================
✅ Upload document thành công
   Document ID: 1

📧 Test 5: Send OTP
====================
✅ Gửi OTP thành công
   OTP: 123456
   📧 Kiểm tra email hoặc console log để xem OTP

🎉 Hoàn thành tất cả tests!
```

## 📧 Email OTP

### Development Mode (Mặc định)
Email được log ra console. Bạn sẽ thấy:

```
📧 [EMAIL] Would send email: {
  to: 'signer@example.com',
  subject: 'Mã OTP ký tài liệu - Test Contract',
  html: '...'
}
```

### Production Mode (Optional)
Nếu muốn gửi email thật, tạo file `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@wpsign.local
```

**Gmail**: Cần tạo App Password tại https://myaccount.google.com/apppasswords

## 🎯 Test Flow Ký Tài Liệu

1. **Login** → Lấy access token
2. **Upload Document** → Lấy document_id
3. **Create Sign Request** → Thêm signers
4. **Send OTP** → Xem OTP trong console/email
5. **Sign Document** → Dùng OTP để ký
6. **Check Status** → Xem "completed"

## 📱 Khởi động Frontend (Test trên UI)

**Mở CMD thứ 2:**
```cmd
cd frontend
npm install
npm run dev
```

Truy cập: http://localhost:3000

**Login:**
- Email: `admin@tenant1.com`
- Password: `password123`

**Test flow:**
1. Upload document
2. Create sign request
3. Send OTP (xem console backend)
4. Sign với OTP
5. View audit logs

→ Chi tiết: **[RUN-NOW.md](RUN-NOW.md)**

## 📚 Tài liệu quan trọng

Đọc theo thứ tự:

1. **[QUICK-START.md](QUICK-START.md)** ← Bắt đầu từ đây
2. **[README-TESTING.md](README-TESTING.md)** ← Hướng dẫn test
3. **[TEST-CHECKLIST.md](TEST-CHECKLIST.md)** ← 50+ test cases
4. **[docs/email-setup.md](docs/email-setup.md)** ← Cấu hình email
5. **[NEXT-STEPS.md](NEXT-STEPS.md)** ← Phát triển tiếp

## ❓ Câu hỏi thường gặp

### Backend không khởi động?
```bash
# Kiểm tra PostgreSQL đang chạy
# Chạy lại:
npx prisma generate
npx prisma db push
```

### Test script báo lỗi?
```bash
# Đảm bảo backend đang chạy
# Kiểm tra port 4000 có bị chiếm không
```

### Email không gửi?
- **Dev mode**: Xem console log, không cần config
- **Prod mode**: Kiểm tra SMTP credentials

### OTP không hoạt động?
- OTP có hiệu lực 10 phút
- Gửi OTP mới nếu hết hạn
- OTP là 6 chữ số

## ✅ Checklist

- [ ] Backend chạy thành công (port 4000)
- [ ] Database đã seed
- [ ] Test script chạy thành công
- [ ] Thấy OTP trong console log
- [ ] Login vào frontend được (optional)

## 🎉 Xong rồi!

Bây giờ bạn có thể:

### 1. Test thêm
- Dùng REST Client file `test-api.http`
- Test trên frontend UI
- Xem audit logs

### 2. Cấu hình email
- Setup SMTP để gửi email thật
- Test với Gmail/Outlook

### 3. Phát triển tiếp
- Xem roadmap trong [NEXT-STEPS.md](NEXT-STEPS.md)
- Chọn feature để implement
- SMS OTP, Audit UI, Templates, etc.

### 4. Deploy
- Setup production environment
- Configure SMTP
- Deploy với Docker

## 🚀 Tiếp theo làm gì?

**Nếu muốn test ngay:**
→ Chạy `npx ts-node scripts/test-basic-flow.ts`

**Nếu muốn phát triển:**
→ Đọc [NEXT-STEPS.md](NEXT-STEPS.md)

**Nếu cần help:**
→ Xem [docs/](docs/) folder

---

**Happy coding!** 🎉

Nếu có vấn đề gì, check:
- [README-TESTING.md](README-TESTING.md) - Troubleshooting
- [docs/email-setup.md](docs/email-setup.md) - Email issues
- Console logs - Error messages

**Version**: 1.1.0  
**Last Updated**: 2025-11-18
