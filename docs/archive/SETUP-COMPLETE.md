# ✅ Setup hoàn chỉnh - WP Sign

## 📊 Hiện trạng

### Đang chạy trên Docker ✅
- ✅ **PostgreSQL** (port 5432) - Database
- ✅ **Redis** (port 6379) - Cache

### Cần chạy locally 🔄
- 🔄 **Backend** (port 4000) - API server
- 🔄 **Frontend** (port 3000) - UI
- 🔄 **License Server** (port 5000) - Optional

---

## 🚀 Cách chạy đúng

### Bước 1: Kiểm tra Docker (Đã chạy rồi ✅)

```cmd
docker ps
```

Bạn sẽ thấy:
- `projectwpsign-db-1` (PostgreSQL)
- `projectwpsign-redis-1` (Redis)

### Bước 2: Chạy Backend (CMD)

**Mở CMD window 1:**
```cmd
cd <repository-root>\backend
npm run dev
```

Đợi đến khi thấy:
```
🚀 Server running on http://localhost:4000
✅ Database connected
✅ Redis connected
```

### Bước 3: Chạy Frontend (CMD)

**Mở CMD window 2:**
```cmd
cd <repository-root>\frontend
npm run dev
```

Đợi đến khi thấy:
```
- Local:   http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### Bước 4: Test trên Browser

Mở http://localhost:3000

**Login:**
- Email: `admin@tenant1.com`
- Password: `password123`

---

## 🎯 Test Flow trên UI

### 1. Dashboard
- Xem overview
- Recent documents
- Recent sign requests

### 2. Upload Document
1. Click "Documents" trong sidebar
2. Click "Upload Document" button
3. Chọn file PDF (hoặc drag & drop)
4. Click "Upload"
5. Document sẽ xuất hiện trong list

### 3. Create Sign Request
1. Click "Sign Requests" trong sidebar
2. Click "Create Sign Request"
3. Chọn document từ dropdown
4. Nhập title: "Hợp đồng test"
5. Nhập message: "Vui lòng ký tài liệu"
6. Thêm signer:
   - Email: `test@example.com`
   - Name: `Test User`
   - Role: `signer`
7. Click "Add Signer" (nếu muốn thêm nhiều người)
8. Click "Create Sign Request"

### 4. Send OTP
1. Click vào sign request vừa tạo
2. Trong danh sách signers, click "Send OTP"
3. **Quan trọng**: Xem OTP trong **CMD của Backend**
4. Tìm dòng:
   ```
   📧 [EMAIL] Would send email: {
     to: 'test@example.com',
     subject: 'Mã OTP ký tài liệu - Hợp đồng test',
     ...
   }
   ```
5. Trong HTML content, tìm OTP (6 chữ số)
6. Copy OTP

### 5. Sign Document
1. Paste OTP vào ô input
2. Click "Sign" button
3. Signer status sẽ chuyển thành "Completed"
4. Nếu tất cả signers đã ký → Sign request status = "Completed"

### 6. View Audit Logs
1. Click "Audit" trong sidebar
2. Chọn document
3. Xem timeline:
   - document.uploaded
   - sign.started
   - sign.completed

---

## 📧 Xem OTP trong Console

**Backend CMD window** sẽ hiển thị:

```
📧 [EMAIL] Would send email: {
  from: 'WP Sign <noreply@wpsign.local>',
  to: 'test@example.com',
  subject: 'Mã OTP ký tài liệu - Hợp đồng test',
  html: '<!DOCTYPE html>
    <html>
    ...
    <div class="otp-code">123456</div>  ← OTP ở đây
    ...
    </html>'
}
```

Copy số `123456` và paste vào UI.

---

## 🔧 Architecture

```
┌─────────────────────────────────────────┐
│         Browser (localhost:3000)        │
│              Frontend UI                │
└────────────────┬────────────────────────┘
                 │ HTTP Requests
                 ↓
┌─────────────────────────────────────────┐
│      Backend API (localhost:4000)       │
│         Running locally (npm)           │
└─────┬──────────────────────┬────────────┘
      │                      │
      ↓                      ↓
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│   (Docker)   │      │   (Docker)   │
│   port 5432  │      │   port 6379  │
└──────────────┘      └──────────────┘
```

---

## 🐛 Troubleshooting

### Backend không connect được database

**Lỗi:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Giải pháp:**
```cmd
# Kiểm tra Docker containers
docker ps

# Nếu không thấy db, start lại
docker-compose up -d db redis
```

### Backend báo lỗi Prisma

**Lỗi:** `@prisma/client did not initialize yet`

**Giải pháp:**
```cmd
cd backend
npx prisma generate
npx prisma db push
```

### Frontend không connect được backend

**Lỗi:** `Failed to fetch` hoặc `Network Error`

**Giải pháp:**
- Kiểm tra backend đang chạy (port 4000)
- Check `frontend/.env.local`:
  ```
  NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
  ```

### Port bị chiếm

**Backend (4000):**
```cmd
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**Frontend (3000):**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### OTP không thấy trong console

- Đảm bảo đang xem **Backend CMD window**
- Scroll lên để tìm dòng `📧 [EMAIL]`
- Nếu không thấy, check backend logs có lỗi không

---

## 📊 Services Status

| Service | Status | Port | URL |
|---------|--------|------|-----|
| PostgreSQL | ✅ Docker | 5432 | localhost:5432 |
| Redis | ✅ Docker | 6379 | localhost:6379 |
| Backend | 🔄 Local | 4000 | http://localhost:4000 |
| Frontend | 🔄 Local | 3000 | http://localhost:3000 |

---

## ✅ Checklist

- [x] Docker containers chạy (db + redis)
- [ ] Backend chạy (CMD window 1)
- [ ] Frontend chạy (CMD window 2)
- [ ] Mở browser http://localhost:3000
- [ ] Login thành công
- [ ] Upload document
- [ ] Create sign request
- [ ] Send OTP (xem backend console)
- [ ] Copy OTP từ console
- [ ] Sign document với OTP
- [ ] View audit logs

---

## 🎉 Hoàn thành!

Bây giờ bạn có:
- ✅ Database & Redis trên Docker
- ✅ Backend API chạy local
- ✅ Frontend UI chạy local
- ✅ Email OTP hoạt động (console log)
- ✅ Full flow test được trên UI

**Next:** Test toàn bộ flow và xem email OTP trong backend console!

---

## 💡 Tips

1. **Luôn xem Backend console** để debug và xem OTP
2. **Dùng CMD** thay vì PowerShell để tránh execution policy issues
3. **Mở 2 CMD windows** riêng cho backend và frontend
4. **Check Network tab** trong browser DevTools nếu có lỗi API
5. **OTP có hiệu lực 10 phút** - gửi mới nếu hết hạn

---

**Quick Commands:**

```cmd
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: View database (optional)
cd backend
npx prisma studio
```

**Test Account:**
- Email: `admin@tenant1.com`
- Password: `password123`
