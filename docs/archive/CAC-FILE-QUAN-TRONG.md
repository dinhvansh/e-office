# 📁 CÁC FILE QUAN TRỌNG

## 🚀 Khởi Động Hệ Thống

| File | Mô tả |
|------|-------|
| `start.bat` | Script khởi động nhanh (Windows) |
| `start-all.ps1` | Script khởi động đầy đủ (PowerShell) |
| `run.ps1` | Script chạy đơn giản |
| `stop-all.ps1` | Script dừng hệ thống |

## 📖 Hướng Dẫn

| File | Mô tả |
|------|-------|
| `DANG-NHAP-NGAY.txt` | ⭐ Thông tin đăng nhập (ĐỌC ĐẦU TIÊN) |
| `HE-THONG-DA-CHAY.md` | ⭐ Hướng dẫn đầy đủ sau khi chạy |
| `BAT-DAU-O-DAY.md` | Hướng dẫn siêu ngắn |
| `HUONG-DAN-CHAY-THU.md` | Hướng dẫn chi tiết |
| `README.md` | Tổng quan dự án |
| `QUICK-START.md` | Hướng dẫn nhanh |
| `START-SERVERS.md` | Hướng dẫn khởi động services |

## ⚙️ Cấu Hình

| File | Mô tả |
|------|-------|
| `backend/.env` | ⭐ Backend config (đã tạo) |
| `frontend/.env.local` | ⭐ Frontend config (đã tạo) |
| `docker-compose.yml` | Docker config |

## 🧪 Testing

| File | Mô tả |
|------|-------|
| `test-api.http` | Test API với REST Client |
| `test-workflows.http` | Test workflows |
| `test-approvals.http` | Test approvals |
| `README-TESTING.md` | Hướng dẫn test |

## 📚 Tài Liệu Kỹ Thuật

| File | Mô tả |
|------|-------|
| `AGENTS.md` | Lịch sử phát triển (AI sessions) |
| `CODE-MAP.md` | Kiến trúc code |
| `ERD.md` | Database schema |
| `FUNCTIONAL_SPEC.md` | Yêu cầu chức năng |
| `ROADMAP-E-OFFICE.md` | Lộ trình 14 tuần |
| `PHASE-1-PLAN.md` | Kế hoạch Phase 1 |
| `PHASE-2-PLAN.md` | Kế hoạch Phase 2 |

## 🔧 Scripts Backend

| File | Mô tả |
|------|-------|
| `backend/scripts/seed.js` | Seed tenant + admin user |
| `backend/scripts/seed-rbac.js` | Seed roles + permissions |
| `backend/scripts/seed-document-types.js` | Seed 8 loại văn bản |
| `backend/scripts/seed-workflows.js` | Seed 3 workflows |
| `backend/scripts/fix-admin-permissions.js` | ⭐ Fix admin permissions (đã chạy) |

---

## 🎯 FILE QUAN TRỌNG NHẤT

### 1. DANG-NHAP-NGAY.txt
```
Email:    admin@acme.local
Password: secret123
URL:      http://localhost:3000
```

### 2. HE-THONG-DA-CHAY.md
Hướng dẫn đầy đủ về:
- Cách truy cập
- Các tính năng
- Cách dừng/chạy lại
- Xử lý lỗi

### 3. backend/.env
Config backend (DATABASE_URL, JWT_SECRET, etc.)

### 4. frontend/.env.local
Config frontend (API URL)

---

## 📂 Cấu Trúc Thư Mục

```
e-office/
├── backend/          # Express API
│   ├── src/          # Source code
│   ├── prisma/       # Database schema
│   ├── scripts/      # Seed scripts
│   └── .env          # Config (đã tạo)
├── frontend/         # Next.js UI
│   ├── app/          # Pages
│   ├── components/   # UI components
│   └── .env.local    # Config (đã tạo)
├── license-server/   # License service
└── docs/             # Documentation
```

---

## 🔍 TÌM FILE NHANH

### Muốn đăng nhập?
→ `DANG-NHAP-NGAY.txt`

### Muốn biết hệ thống có gì?
→ `HE-THONG-DA-CHAY.md`

### Muốn test API?
→ `test-api.http`

### Muốn hiểu code?
→ `CODE-MAP.md`

### Muốn xem lịch sử phát triển?
→ `AGENTS.md`

### Muốn chạy lại hệ thống?
→ `start.bat` hoặc `start-all.ps1`

---

**Tất cả files đều ở thư mục gốc dự án!** 📁
