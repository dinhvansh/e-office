# Setup & Backup - E-Office System

**Thư mục này chứa tất cả tài liệu và scripts liên quan đến setup và backup hệ thống.**

---

## 📁 Nội Dung

### 1. Setup Documentation

#### `SETUP-NEW-MACHINE.md` ⭐
**Hướng dẫn setup đầy đủ cho máy mới**
- 11 bước chi tiết (30-45 phút)
- Yêu cầu hệ thống
- Cài đặt dependencies
- Setup Docker (PostgreSQL + Redis)
- Database migration
- Data restore
- Environment configuration
- Server startup
- Verification checklist
- Troubleshooting guide

**Khi nào dùng**: Setup project lần đầu trên máy mới

---

### 2. Backup Scripts

#### `backup-all.ps1` ⭐
**Script tổng hợp backup toàn bộ hệ thống**

**Chức năng**:
- Backup database (gọi backup-database.js)
- Copy storage files
- Copy environment templates
- Tạo README cho backup
- Tạo ZIP archive

**Cách dùng**:
```powershell
# Từ root directory
.\docs\setup-and-backup\backup-all.ps1
```

**Output**:
- `backup-YYYY-MM-DD_HH-MM-SS/` - Thư mục backup
- `backup-YYYY-MM-DD_HH-MM-SS.zip` - File ZIP (dễ transfer)

---

#### `backup-database.js`
**Script backup database ra JSON file**

**Chức năng**:
- Export 20 tables ra 1 file JSON
- Bao gồm metadata (timestamp, version)
- Tạo thư mục backups tự động
- Hiển thị progress và summary

**Cách dùng**:
```bash
cd backend
node ../docs/setup-and-backup/backup-database.js
```

**Output**:
- File: `backend/backups/database-backup-YYYY-MM-DDTHH-MM-SS.json`

**Tables được backup** (20 tables):
- tenants, departments, positions, users
- permissions, roles, role_permissions, user_roles
- document_types, numbering_rules, external_organizations
- workflows, workflow_steps, documents
- workflow_instances, document_approvals
- sign_requests, signers, sign_request_fields, sign_request_field_values

---

#### `restore-database.js`
**Script restore database từ backup JSON**

**Chức năng**:
- Import data từ backup file
- Respect foreign key order
- Error handling per table
- Progress reporting

**Cách dùng**:
```bash
cd backend
node ../docs/setup-and-backup/restore-database.js database-backup-2025-11-23T10-30-00.json
```

**Lưu ý**: File backup phải nằm trong `backend/backups/`

---

## 🚀 Quick Start

### Backup trên máy cũ

```powershell
# Chạy từ root directory
.\docs\setup-and-backup\backup-all.ps1
```

→ Tạo file `backup-YYYY-MM-DD_HH-MM-SS.zip`

### Setup trên máy mới

1. Clone project:
```bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

2. Follow hướng dẫn:
```bash
# Đọc file này
docs/setup-and-backup/SETUP-NEW-MACHINE.md
```

3. Restore data:
```bash
# Copy backup file vào backend/backups/
cd backend
node ../docs/setup-and-backup/restore-database.js database-backup.json
```

---

## 📊 Workflow Tổng Quan

```
┌─────────────────┐
│   Máy Cũ        │
│                 │
│ 1. Run backup   │
│    script       │
│                 │
│ 2. Get ZIP file │
└────────┬────────┘
         │
         │ Transfer ZIP
         │
         ▼
┌─────────────────┐
│   Máy Mới       │
│                 │
│ 1. Clone repo   │
│                 │
│ 2. Extract ZIP  │
│                 │
│ 3. Follow       │
│    SETUP guide  │
│                 │
│ 4. Restore DB   │
│                 │
│ 5. Start servers│
└─────────────────┘
```

---

## 🔧 Troubleshooting

### Lỗi: "Cannot find backup file"

**Giải pháp**:
```bash
# Kiểm tra file có trong backend/backups/
ls backend/backups/

# Nếu không có, copy file vào đó
```

### Lỗi: "Prisma Client not generated"

**Giải pháp**:
```bash
cd backend
npx prisma generate
```

### Lỗi: "Database connection failed"

**Giải pháp**:
```bash
# Kiểm tra Docker
docker-compose ps

# Restart Docker services
docker-compose down
docker-compose up -d
```

---

## 📝 Lưu Ý Quan Trọng

### ⚠️ Security

1. **Không backup file .env thực tế** - Chỉ backup .env.example
2. **Generate lại JWT secrets** cho production
3. **Không commit backup files** lên Git (đã có trong .gitignore)

### 💡 Best Practices

1. **Backup thường xuyên** - Ít nhất 1 lần/tuần
2. **Test restore process** - Đảm bảo backup hoạt động
3. **Lưu backup ở nhiều nơi** - Local + Cloud storage
4. **Document changes** - Ghi chú khi có thay đổi lớn

### 📦 Backup Checklist

- [ ] Database backup (JSON file)
- [ ] Storage files (uploaded documents)
- [ ] Environment templates (.env.example)
- [ ] Custom configurations (nếu có)
- [ ] Test restore process

---

## 🔗 Tài Liệu Liên Quan

- **Quick Start**: `../../QUICK-START.md`
- **Testing Guide**: `../../README-TESTING.md`
- **Architecture**: `../../CODE-MAP.md`
- **Development Guide**: `../../START-HERE-FOR-AI.md`
- **Task Checklist**: `../dev/TASK-CHECKLIST-GUIDE.md`
- **Agents Log**: `../../AGENTS.md`

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Đọc phần Troubleshooting trong `SETUP-NEW-MACHINE.md`
2. Check session logs trong `docs/dev/SESSION-*.md`
3. Tạo issue trên GitHub

---

**Last Updated**: 2025-11-23  
**Version**: 1.0.0  
**Maintainer**: Development Team
