# ⚡ Chạy ngay - WP Sign

## 🚨 Lỗi PowerShell?

Nếu bạn gặp lỗi:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded
```

→ **Dùng CMD thay vì PowerShell!**

---

## 🚀 Cách chạy (2 phút)

### ✅ Docker đã chạy rồi!

Kiểm tra:
```cmd
docker ps
```

Bạn sẽ thấy PostgreSQL và Redis đang chạy. ✅

### Bước 1: Mở CMD (Command Prompt)

**Cách 1:** Nhấn `Win + R`, gõ `cmd`, Enter

**Cách 2:** Search "Command Prompt" trong Start Menu

**Cách 3:** Trong VS Code, mở Terminal → Click dropdown → Chọn "Command Prompt"

### Bước 2: Chạy Backend

**CMD Window 1:**
```cmd
cd E:\2.CODE\PROJECT WP SIGN\backend
npm run dev
```

Đợi đến khi thấy:
```
🚀 Server running on http://localhost:4000
✅ Database connected
```

**Quan trọng:** Giữ window này mở để xem OTP!

### Bước 3: Mở CMD thứ 2 và chạy Frontend

**CMD Window 2:**
```cmd
cd E:\2.CODE\PROJECT WP SIGN\frontend
npm run dev
```

Đợi đến khi thấy:
```
- Local:   http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### Bước 4: Mở Browser

Truy cập: http://localhost:3000

Login với:
- Email: `admin@tenant1.com`
- Password: `password123`

---

## 🎯 Test trên UI

### 1. Upload Document
- Click "Documents" → "Upload Document"
- Chọn file PDF
- Click "Upload"

### 2. Create Sign Request
- Click "Sign Requests" → "Create Sign Request"
- Chọn document vừa upload
- Thêm signer:
  - Email: `test@example.com`
  - Name: `Test User`
- Click "Create"

### 3. Send OTP
- Click vào sign request vừa tạo
- Click "Send OTP"
- **Xem OTP trong CMD của Backend** (terminal đang chạy backend)
- Tìm dòng: `📧 [EMAIL] Would send email:`
- Copy OTP (6 chữ số)

### 4. Sign Document
- Paste OTP vào ô input
- Click "Sign"
- Status sẽ chuyển thành "Completed"

### 5. View Audit Logs
- Click "Audit" trong sidebar
- Chọn document
- Xem timeline

---

## 📧 Xem OTP trong Console

Trong terminal Backend (CMD), bạn sẽ thấy:

```
📧 [EMAIL] Would send email: {
  to: 'test@example.com',
  subject: 'Mã OTP ký tài liệu - ...',
  ...
}
```

Trong HTML content, tìm OTP (6 chữ số) và copy để sign.

---

## 🐛 Nếu có lỗi

### Backend không chạy?
```cmd
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

### Frontend không chạy?
```cmd
cd frontend
npm install
npm run dev
```

### Port bị chiếm?
```cmd
# Kill process trên port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Kill process trên port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## ✅ Checklist

- [ ] Mở 2 CMD windows
- [ ] Backend chạy (port 4000)
- [ ] Frontend chạy (port 3000)
- [ ] Mở http://localhost:3000
- [ ] Login thành công
- [ ] Upload document
- [ ] Create sign request
- [ ] Send OTP (xem console)
- [ ] Sign với OTP
- [ ] View audit logs

---

## 🎉 Xong!

Bây giờ bạn có thể test toàn bộ chức năng trên giao diện!

**Cần help?** Xem [START-SERVERS.md](START-SERVERS.md) để biết thêm chi tiết.

---

**Quick Links:**
- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- Prisma Studio: `npx prisma studio` (port 5555)

**Test Account:**
- Email: `admin@tenant1.com`
- Password: `password123`
