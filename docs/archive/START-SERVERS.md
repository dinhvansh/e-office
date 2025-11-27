# 🚀 Hướng Dẫn Bật Phần Mềm

**Project**: WP Sign / E-Office System  
**Last Updated**: 2025-11-20

---

## 📋 Yêu Cầu

- ✅ Node.js đã cài (v18+)
- ✅ Docker Desktop đang chạy
- ✅ Git đã clone project

---

## 🔧 Bước 1: Khởi Động Database (Docker)

### Cách 1: Dùng Docker Desktop
1. Mở **Docker Desktop**
2. Vào tab **Containers**
3. Tìm containers:
   - `projectwpsign-postgres-1`
   - `projectwpsign-redis-1`
4. Click nút **▶️ Start** nếu chưa chạy

### Cách 2: Dùng Command Line
```bash
# Vào thư mục project
cd "E:\2.CODE\PROJECT WP SIGN"

# Khởi động database
docker-compose up -d postgres redis
```

### Kiểm Tra Database Đã Chạy
```bash
docker ps
```

Kết quả phải có:
```
CONTAINER ID   IMAGE            STATUS          PORTS
...            postgres:16      Up X seconds    0.0.0.0:5432->5432/tcp
...            redis:7-alpine   Up X seconds    0.0.0.0:6379->6379/tcp
```

---

## 🖥️ Bước 2: Khởi Động Backend

### Mở Terminal 1
```bash
# Vào thư mục backend
cd backend

# Chạy backend
npm run dev
```

### Kết Quả Thành Công
```
Backend listening on port 4000
```

**Backend URL**: http://localhost:4000

---

## 🌐 Bước 3: Khởi Động Frontend

### Mở Terminal 2 (Terminal mới)
```bash
# Vào thư mục frontend
cd frontend

# Chạy frontend
npm run dev
```

### Kết Quả Thành Công
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
✓ Ready in 5.5s
```

**Frontend URL**: http://localhost:3000

---

## ✅ Bước 4: Kiểm Tra & Đăng Nhập

### 1. Mở Trình Duyệt
```
http://localhost:3000
```

### 2. Đăng Nhập
- **Email**: `admin@acme.local`
- **Password**: `admin123`

### 3. Test Các Trang
- ✅ Dashboard: `/`
- ✅ Documents: `/documents`
- ✅ Workflows: `/workflows`
- ✅ Approvals: `/approvals`
- ✅ Users: `/users`
- ✅ Roles: `/roles`
- ✅ Departments: `/departments`
- ✅ External Orgs: `/external-orgs`
- ✅ Document Types: `/document-types`

---

## 🐛 Xử Lý Lỗi

### Lỗi 1: Backend Không Kết Nối Database
```
Can't reach database server at `localhost:5432`
```

**Giải pháp**:
1. Kiểm tra Docker Desktop đang chạy
2. Khởi động lại containers:
   ```bash
   docker-compose restart postgres redis
   ```
3. Restart backend (Ctrl+C rồi `npm run dev` lại)

### Lỗi 2: Port 3000 Đã Được Sử Dụng
```
Port 3000 is already in use
```

**Giải pháp**:
1. Tắt process đang dùng port 3000
2. Hoặc đổi port trong `frontend/package.json`:
   ```json
   "dev": "next dev -p 3001"
   ```

### Lỗi 3: Port 4000 Đã Được Sử Dụng
```
Port 4000 is already in use
```

**Giải pháp**:
1. Tắt process đang dùng port 4000
2. Hoặc đổi port trong `backend/src/server.ts`:
   ```typescript
   const PORT = process.env.PORT || 4001;
   ```

### Lỗi 4: Module Not Found
```
Cannot find module 'xxx'
```

**Giải pháp**:
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## 🔄 Tắt Phần Mềm

### Tắt Backend & Frontend
- Nhấn **Ctrl + C** trong mỗi terminal

### Tắt Database (Tùy Chọn)
```bash
docker-compose stop
```

**Lưu ý**: Không cần tắt database nếu muốn giữ data

---

## 📝 Quick Commands

### Khởi Động Tất Cả (3 Terminals)
```bash
# Terminal 1: Database
docker-compose up -d postgres redis

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Kiểm Tra Status
```bash
# Database
docker ps

# Backend
curl http://localhost:4000/health

# Frontend
curl http://localhost:3000
```

---

## 🎯 Tóm Tắt Nhanh

1. **Bật Docker Desktop** → Start containers
2. **Terminal 1**: `cd backend && npm run dev`
3. **Terminal 2**: `cd frontend && npm run dev`
4. **Mở trình duyệt**: http://localhost:3000
5. **Đăng nhập**: admin@acme.local / admin123

---

## 📞 Cần Giúp?

- **Documentation**: Xem `README.md`
- **Testing**: Xem `README-TESTING.md`
- **API Tests**: Xem `test-api.http`
- **Issues**: Check `LESSONS-LEARNED.md`

---

**Chúc bạn code vui vẻ! 🚀**
