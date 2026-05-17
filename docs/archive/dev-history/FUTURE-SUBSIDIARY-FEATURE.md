# Feature: Thêm cấp Công ty con (Subsidiary)

## 📅 Timeline
- **Planned**: Sau Phase 2 (Week 5+)
- **Estimated effort**: 8 giờ (1 ngày)
- **Priority**: Medium

## 🎯 Mục tiêu
Thêm cấp tổ chức "Công ty con" vào giữa Tenant và Department

### Cấu trúc hiện tại:
```
Tenant (Tập đoàn)
  └── Department (Phòng ban)
       └── User (Nhân viên)
```

### Cấu trúc mới:
```
Tenant (Tập đoàn)
  └── Subsidiary (Công ty con)
       └── Department (Phòng ban)
            └── User (Nhân viên)
```

## 📋 Checklist

### 1. Database (2 giờ)
- [ ] Tạo bảng `subsidiaries`
  - id, tenant_id, code, name, address, phone, manager_id
  - Unique constraint: (tenant_id, code)
- [ ] Thêm field `subsidiary_id` vào bảng `departments`
- [ ] Migration script
- [ ] Seed data (3-5 công ty con mẫu)

### 2. Backend (3 giờ)
- [ ] Module `subsidiaries/`
  - subsidiaries.repository.ts
  - subsidiaries.service.ts
  - subsidiaries.controller.ts
  - subsidiaries.routes.ts
- [ ] Sửa `departments.service.ts`
  - Thêm filter by subsidiary_id
  - Validate subsidiary khi tạo department
- [ ] Thêm permissions: subsidiaries.create/read/update/delete
- [ ] Test cases (test-subsidiaries.http)

### 3. Frontend (2 giờ)
- [ ] Trang `/subsidiaries` (CRUD)
  - Table: Mã, Tên, Địa chỉ, SĐT, Trưởng công ty
  - Dialog form tạo/sửa
- [ ] Sửa trang `/departments`
  - Thêm dropdown chọn công ty con
  - Thêm cột "Công ty con" vào table
- [ ] Thêm menu item "Công ty con" vào sidebar
- [ ] Update types (SubsidiaryRecord)

### 4. Testing (1 giờ)
- [ ] Backend tests (CRUD operations)
- [ ] Frontend UI tests
- [ ] Integration tests (department → subsidiary → tenant)
- [ ] Migration test (data cũ vẫn hoạt động)

## 🔧 Technical Details

### Database Schema
```prisma
model subsidiaries {
  id          Int       @id @default(autoincrement())
  tenant_id   Int
  code        String    @db.VarChar(50)
  name        String
  address     String?
  phone       String?
  manager_id  Int?
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  
  tenant      tenants   @relation(fields: [tenant_id], references: [id])
  manager     users?    @relation("subsidiary_manager", fields: [manager_id], references: [id])
  departments departments[]
  
  @@unique([tenant_id, code])
}

model departments {
  // Thêm field
  subsidiary_id Int?
  
  // Thêm relation
  subsidiary    subsidiaries? @relation(fields: [subsidiary_id], references: [id])
}
```

### API Endpoints
```
GET    /api/v1/subsidiaries          - List all
GET    /api/v1/subsidiaries/:id      - Get by ID
POST   /api/v1/subsidiaries          - Create
PUT    /api/v1/subsidiaries/:id      - Update
DELETE /api/v1/subsidiaries/:id      - Delete
GET    /api/v1/subsidiaries/:id/departments - Get departments
```

## 📊 Impact Analysis

### Modules bị ảnh hưởng:
- ✅ **Users**: Không ảnh hưởng (vẫn thuộc department)
- ✅ **Roles**: Không ảnh hưởng
- ✅ **Documents**: Không ảnh hưởng trực tiếp
- ⚠️ **Departments**: Thêm field subsidiary_id
- ⚠️ **Numbering Rules**: Có thể thêm pattern {SUBSIDIARY} (optional)
- ⚠️ **Document Visibility**: Có thể thêm scope "subsidiary" (optional)

### Backward Compatibility:
- ✅ Departments cũ (subsidiary_id = NULL) vẫn hoạt động
- ✅ Không phá vỡ code hiện tại
- ✅ Migration an toàn

## 💡 Optional Enhancements (Phase 3+)

### Nếu muốn tính năng nâng cao:
- [ ] Approver type "subsidiary_manager" trong workflows
- [ ] Document visibility scope "subsidiary"
- [ ] Numbering pattern với {SUBSIDIARY} code
- [ ] Reports theo công ty con
- [ ] Permissions theo công ty con

## 📝 Notes
- Làm sau khi hoàn thành Phase 2 (Workflow Engine)
- Ưu tiên: Medium (không blocking)
- Chi phí thấp, rủi ro thấp
- Có thể làm song song với Phase 3

## 🔗 Related Documents
- ERD.md - Database schema
- PHASE-2-PLAN.md - Current phase
- ROADMAP-E-OFFICE.md - Overall roadmap
