# 🚀 Hướng Dẫn Chạy Thử Hệ Thống E-Office

## ⚡ Chạy Nhanh (1 Lệnh)

```powershell
.\setup-and-run.ps1
```

**Script này sẽ tự động:**
1. ✅ Kiểm tra Node.js, npm, Docker
2. ✅ Cài đặt dependencies (backend, frontend, license-server)
3. ✅ Khởi động PostgreSQL + Redis
4. ✅ Chạy migrations + seed data
5. ✅ Khởi động 3 services (License Server, Backend, Frontend)
6. ✅ Mở browser tự động

---

## 📋 Yêu Cầu Hệ Thống

### Phải Cài Trước:
- ✅ **Node.js** v18+ hoặc v20+ (LTS)
  - Tải: https://nodejs.org/
  - Kiểm tra: `node --version`

- ✅ **Docker Desktop**
  - Tải: https://www.docker.com/products/docker-desktop/
  - Kiểm tra: `docker --version`
  - **Quan trọng**: Phải khởi động Docker Desktop trước khi chạy script!

### Tự Động Cài:
- npm dependencies (backend, frontend, license-server)
- PostgreSQL + Redis (Docker containers)
- Database schema + seed data

---

## 🎯 Các Bước Chi Tiết

### Bước 1: Cài Node.js (Nếu chưa có)
1. Truy cập: https://nodejs.org/
2. Tải phiên bản **LTS** (khuyến nghị v20.x)
3. Cài đặt với tùy chọn mặc định
4. Mở PowerShell mới và kiểm tra:
```powershell
node --version
npm --version
```

### Bước 2: Cài Docker Desktop (Nếu chưa có)
1. Truy cập: https://www.docker.com/products/docker-desktop/
2. Tải và cài đặt
3. **Khởi động Docker Desktop** (đợi icon màu xanh ở system tray)
4. Kiểm tra:
```powershell
docker --version
docker ps
```

### Bước 3: Chạy Script Setup
```powershell
# Mở PowerShell tại thư mục dự án
# Run this command from the cloned repository root.

# Chạy script
.\setup-and-run.ps1
```

### Bước 4: Đợi Hệ Thống Khởi Động
- Script sẽ mở 3 terminal mới:
  - 🔐 License Server (Port 3001)
  - 🖥️ Backend API (Port 4000)
  - 🌐 Frontend (Port 3000)
- Browser sẽ tự động mở http://localhost:3000
- Đợi khoảng 30 giây để tất cả services sẵn sàng

---

## 🔐 Đăng Nhập

Sau khi browser mở, đăng nhập với:

```
📧 Email:    admin@acme.local
🔑 Password: password123
```

---

## 🛑 Dừng Hệ Thống

### Cách 1: Dùng Script (Khuyến nghị)
```powershell
.\stop-all.ps1
```

### Cách 2: Thủ Công
1. Nhấn `Ctrl+C` trong mỗi terminal (3 terminals)
2. Dừng Docker containers:
```powershell
docker-compose stop
```

---

## 📊 Thông Tin Services

| Service | URL | Port | Mô tả |
|---------|-----|------|-------|
| Frontend | http://localhost:3000 | 3000 | Giao diện người dùng |
| Backend API | http://localhost:4000 | 4000 | REST API |
| License Server | http://localhost:3001 | 3001 | Quản lý license |
| PostgreSQL | localhost:5432 | 5432 | Database |
| Redis | localhost:6379 | 6379 | Cache |

---

## 🧪 Test Hệ Thống

### Test API (VS Code REST Client)
```powershell
# Mở file test
code test-api.http
```

### Test Tự Động
```powershell
cd backend
node scripts/test-basic-flow.ts
```

---

## 🐛 Xử Lý Lỗi

### Lỗi: "Docker is not running"
**Giải pháp:**
1. Mở Docker Desktop
2. Đợi icon màu xanh ở system tray
3. Chạy lại script

### Lỗi: "Port already in use"
**Giải pháp:**
```powershell
# Dừng tất cả services
.\stop-all.ps1

# Hoặc kill port thủ công
netstat -ano | findstr :3000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Lỗi: "Cannot find module"
**Giải pháp:**
```powershell
# Cài lại dependencies
cd backend
npm install

cd ../frontend
npm install

cd ../license-server
npm install
```

### Lỗi: Database connection failed
**Giải pháp:**
```powershell
# Restart Docker containers
docker-compose restart postgres redis

# Đợi 10 giây
Start-Sleep -Seconds 10

# Chạy lại backend
cd backend
npm run dev
```

### Reset Database (Xóa hết data)
```powershell
cd backend
npx prisma db push --force-reset
node scripts/seed.js
node scripts/seed-rbac.js
node scripts/seed-workflows.js
```

---

## 📚 Tài Liệu Khác

- `README.md` - Tổng quan dự án
- `QUICK-START.md` - Hướng dẫn nhanh
- `README-TESTING.md` - Hướng dẫn test
- `docs/testing-guide.md` - Chi tiết testing
- `AGENTS.md` - Lịch sử phát triển

---

## 💡 Tips

### Chạy Lại Nhanh (Đã Setup)
Nếu đã chạy script 1 lần, lần sau chỉ cần:
```powershell
.\start-all.ps1
```

### Xem Logs
- Logs hiển thị trong 3 terminals đã mở
- Backend logs: Terminal màu xanh dương
- Frontend logs: Terminal màu xanh lá
- License Server logs: Terminal màu tím

### Tắt Database Khi Không Dùng
```powershell
docker-compose stop
```

### Khởi động lại Database
```powershell
docker-compose start
```

---

## 🎯 Các Tính Năng Có Thể Test

### 1. Quản Lý Người Dùng
- Tạo/Sửa/Xóa người dùng
- Phân quyền (Admin, Manager, User, Viewer)
- Gán phòng ban, chức danh

### 2. Quản Lý Tổ Chức
- Phòng ban (Departments)
- Chức danh (Positions)
- Vai trò (Roles)
- Phân quyền chi tiết (27 permissions)

### 3. Quản Lý Văn Bản
- Upload văn bản
- Phân loại văn bản (8 loại)
- Đánh số tự động
- Phân quyền xem (Public/Department/Private)
- Mức độ mật (Normal/Confidential/Secret)

### 4. Quy Trình Phê Duyệt
- Tạo workflow template
- 4 chế độ workflow:
  - No Approval (Không cần duyệt)
  - Strict (Theo template cố định)
  - Flexible (Tùy chỉnh được)
  - Ad-hoc (Tạo mới từ đầu)
- Approve/Reject/Request Info
- Email notifications

### 5. Chữ Ký Điện Tử (90% hoàn thành)
- Tạo sign request
- Thêm signers
- OTP verification
- Sign fields editor (đang phát triển)

---

## 🚀 Sẵn Sàng!

Bây giờ bạn có thể:
1. ✅ Chạy script: `.\setup-and-run.ps1`
2. ✅ Đợi 30 giây
3. ✅ Đăng nhập: admin@acme.local / password123
4. ✅ Khám phá hệ thống!

**Chúc bạn test vui vẻ!** 🎉
