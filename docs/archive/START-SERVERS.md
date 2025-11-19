# 🚀 Khởi động Backend & Frontend

## ⚠️ PowerShell Execution Policy Issue

Nếu bạn gặp lỗi:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled
```

Có 2 cách giải quyết:

### Cách 1: Dùng CMD thay vì PowerShell (Khuyến nghị)

#### Terminal 1: Backend
```cmd
cd backend
npm run dev
```

#### Terminal 2: Frontend
```cmd
cd frontend
npm run dev
```

### Cách 2: Thay đổi Execution Policy (Cần Admin)

Mở PowerShell **as Administrator** và chạy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Sau đó chạy lại:
```powershell
cd backend
npm run dev
```

---

## 📝 Hướng dẫn chi tiết

### Bước 1: Mở 2 Terminal

**Terminal 1 (Backend):**
1. Mở Command Prompt (CMD) hoặc PowerShell
2. Navigate đến thư mục backend
3. Chạy `npm run dev`

**Terminal 2 (Frontend):**
1. Mở Command Prompt (CMD) hoặc PowerShell mới
2. Navigate đến thư mục frontend
3. Chạy `npm run dev`

### Bước 2: Kiểm tra

**Backend:**
- URL: http://localhost:4000
- Check: http://localhost:4000/api/v1/tenants/me (sẽ trả về 401 nếu không có token)

**Frontend:**
- URL: http://localhost:3000
- Login page sẽ hiển thị

### Bước 3: Login

Truy cập http://localhost:3000 và login với:
- **Email**: `admin@tenant1.com`
- **Password**: `password123`

---

## 🎯 Test Flow trên UI

### 1. Login
- Vào http://localhost:3000
- Nhập email/password
- Click "Login"

### 2. Upload Document
- Click "Documents" trong sidebar
- Click "Upload Document"
- Chọn file PDF
- Click "Upload"

### 3. Create Sign Request
- Click "Sign Requests" trong sidebar
- Click "Create Sign Request"
- Chọn document
- Thêm signers (email + name)
- Click "Create"

### 4. Send OTP
- Vào sign request detail
- Click "Send OTP" cho signer
- **Dev mode**: Xem OTP trong console log của backend
- **Prod mode**: Check email inbox

### 5. Sign Document
- Nhập OTP
- Click "Sign"
- Document status sẽ chuyển thành "completed"

### 6. View Audit Logs
- Click "Audit" trong sidebar
- Chọn document
- Xem timeline của tất cả actions

---

## 🐛 Troubleshooting

### Backend không khởi động

**Lỗi: "Port 4000 already in use"**
```cmd
# Windows: Kill process trên port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**Lỗi: "Cannot connect to database"**
- Kiểm tra PostgreSQL đang chạy
- Check DATABASE_URL trong .env
- Chạy: `npx prisma generate`

### Frontend không khởi động

**Lỗi: "Port 3000 already in use"**
```cmd
# Windows: Kill process trên port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Lỗi: "Module not found"**
```cmd
cd frontend
npm install
```

### Email không gửi

**Dev mode:**
- Xem console log của backend terminal
- Tìm dòng: `📧 [EMAIL] Would send email:`

**Prod mode:**
- Check SMTP config trong `backend/.env`
- Test với Gmail App Password

### OTP không hoạt động

- OTP có hiệu lực 10 phút
- Gửi OTP mới nếu hết hạn
- Check console log để xem OTP

---

## 📊 Ports

| Service | Port | URL |
|---------|------|-----|
| Backend | 4000 | http://localhost:4000 |
| Frontend | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## 🔧 Useful Commands

### Backend
```cmd
cd backend

# Start dev server
npm run dev

# View database
npx prisma studio

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Run tests
npx ts-node scripts/test-basic-flow.ts
```

### Frontend
```cmd
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Run E2E tests
npm run test:e2e
```

---

## 🎨 UI Features

### Dashboard
- Overview statistics
- Recent documents
- Recent sign requests

### Documents
- List all documents
- Upload new document
- View document detail
- Delete document

### Sign Requests
- List all sign requests
- Create new sign request
- View sign request detail
- Send OTP to signers
- Sign document with OTP
- Cancel sign request

### Audit Logs
- View document history
- Filter by event type
- Timeline view

### Settings
- Tenant information
- User profile
- Webhook configuration

---

## 📧 Email trong Console

Khi gửi OTP trong dev mode, bạn sẽ thấy trong backend console:

```
📧 [EMAIL] Would send email: {
  from: 'WP Sign <noreply@wpsign.local>',
  to: 'signer@example.com',
  subject: 'Mã OTP ký tài liệu - Hợp đồng thuê nhà',
  html: '<!DOCTYPE html>...'
}
```

Copy OTP từ HTML content và paste vào UI để sign.

---

## ✅ Checklist

- [ ] Backend chạy thành công (port 4000)
- [ ] Frontend chạy thành công (port 3000)
- [ ] Login được vào UI
- [ ] Upload document được
- [ ] Create sign request được
- [ ] Send OTP (xem console log)
- [ ] Sign document với OTP
- [ ] View audit logs

---

## 🎉 Xong!

Bây giờ bạn có thể:
- Test toàn bộ flow trên UI
- Upload và ký documents
- Xem audit logs
- Configure webhooks
- Test email OTP

**Happy testing!** 🚀

---

**Tips:**
- Dùng CMD thay vì PowerShell để tránh execution policy issues
- Mở 2 terminal riêng cho backend và frontend
- Xem console log của backend để debug
- Check Network tab trong browser DevTools nếu có lỗi API
