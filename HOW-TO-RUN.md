# 🎯 Cách chạy WP Sign - Hướng dẫn đầy đủ

## 📋 Tóm tắt

- ✅ **PostgreSQL & Redis**: Đã chạy trên Docker
- 🔄 **Backend**: Cần chạy bằng `npm run dev` (CMD)
- 🔄 **Frontend**: Cần chạy bằng `npm run dev` (CMD)

---

## ⚡ Cách nhanh nhất (Khuyến nghị)

```cmd
npm install
npm run dev
```

Xong! Cả backend và frontend sẽ chạy cùng lúc.

Chi tiết: **[RUN-BOTH.md](RUN-BOTH.md)** ⭐

---

## 🚀 Hoặc chạy riêng (3 bước)

### Bước 1: Kiểm tra Docker ✅

```cmd
docker ps
```

Phải thấy 2 containers:
- `projectwpsign-db-1` (PostgreSQL)
- `projectwpsign-redis-1` (Redis)

Nếu không thấy:
```cmd
docker-compose up -d db redis
```

### Bước 2: Chạy Backend 🔄

**Mở CMD window 1:**
```cmd
cd E:\2.CODE\PROJECT WP SIGN\backend
npm run dev
```

**Chờ đến khi thấy:**
```
🚀 Server running on http://localhost:4000
✅ Database connected
✅ Redis connected
```

**⚠️ Giữ window này mở** - Bạn sẽ xem OTP ở đây!

### Bước 3: Chạy Frontend 🔄

**Mở CMD window 2:**
```cmd
cd E:\2.CODE\PROJECT WP SIGN\frontend
npm run dev
```

**Chờ đến khi thấy:**
```
- Local:   http://localhost:3000
```

---

## 🌐 Mở Browser

Truy cập: **http://localhost:3000**

**Login:**
- Email: `admin@tenant1.com`
- Password: `password123`

---

## 🎯 Test Flow

### 1. Upload Document
- Click "Documents" → "Upload Document"
- Chọn file PDF
- Upload

### 2. Create Sign Request
- Click "Sign Requests" → "Create"
- Chọn document
- Thêm signer: `test@example.com` / `Test User`
- Create

### 3. Send OTP
- Click "Send OTP"
- **Xem Backend CMD window** (window 1)
- Tìm dòng: `📧 [EMAIL] Would send email:`
- Copy OTP (6 chữ số)

### 4. Sign
- Paste OTP
- Click "Sign"
- Status → "Completed" ✅

---

## 📧 Xem OTP

**Backend CMD window sẽ hiển thị:**

```
📧 [EMAIL] Would send email: {
  to: 'test@example.com',
  subject: 'Mã OTP ký tài liệu - ...',
  html: '...
    <div class="otp-code">123456</div>
  ...'
}
```

Copy `123456` và paste vào UI.

---

## 🐛 Lỗi thường gặp

### "npm.ps1 cannot be loaded"
→ Dùng **CMD** thay vì PowerShell!

### "Port 4000 already in use"
```cmd
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### "Cannot connect to database"
```cmd
docker ps
# Nếu không thấy db:
docker-compose up -d db redis
```

### "Prisma error"
```cmd
cd backend
npx prisma generate
npx prisma db push
```

---

## ✅ Checklist

- [ ] Docker containers chạy (db + redis)
- [ ] Backend chạy (CMD 1) - port 4000
- [ ] Frontend chạy (CMD 2) - port 3000
- [ ] Mở http://localhost:3000
- [ ] Login thành công
- [ ] Upload document
- [ ] Create sign request
- [ ] Send OTP → Xem backend console
- [ ] Copy OTP
- [ ] Sign document
- [ ] Status = "Completed"

---

## 🎉 Xong!

Bây giờ bạn có thể:
- ✅ Test toàn bộ flow trên UI
- ✅ Xem OTP trong backend console
- ✅ Upload và ký documents
- ✅ View audit logs

---

## 📚 Tài liệu thêm

- **[SETUP-COMPLETE.md](SETUP-COMPLETE.md)** - Hướng dẫn chi tiết
- **[START-SERVERS.md](START-SERVERS.md)** - Troubleshooting
- **[RUN-NOW.md](RUN-NOW.md)** - Quick guide
- **[README-TESTING.md](README-TESTING.md)** - Testing guide

---

**Quick Commands:**

```cmd
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Check Docker
docker ps

# View database
cd backend
npx prisma studio
```

**Test Account:**
- `admin@tenant1.com` / `password123`

**URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Prisma Studio: http://localhost:5555 (after `npx prisma studio`)
