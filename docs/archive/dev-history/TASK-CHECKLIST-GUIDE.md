# Task Implementation Checklist Guide

**Mục đích**: Đảm bảo mọi task được implement đầy đủ, an toàn, và dễ đồng bộ giữa các dev.

---

## 📋 Checklist Tổng Quan

Mỗi khi làm task mới, đi qua **7 bước** này:

1. ✅ **Đọc Task Spec**
2. ✅ **API Contract**
3. ✅ **Database Schema**
4. ✅ **Security**
5. ✅ **Frontend Implementation**
6. ✅ **Testing**
7. ✅ **Documentation & Logging**

---

## 1️⃣ Đọc Task Spec

### Làm gì?
- Đọc file task `docs/dev/TASK-*.md` hoặc `FEATURE-*.md`
- Ghi lại **Acceptance Criteria** (AC) - danh sách yêu cầu phải đạt
- Hiểu rõ business logic và edge cases

### Ví dụ:
```markdown
## Acceptance Criteria
- [ ] User có thể tạo document với document_type_id
- [ ] Hệ thống tự động generate document_number nếu type yêu cầu
- [ ] Admin có thể xem tất cả documents
- [ ] User chỉ xem documents của department mình
```

### Output:
- Danh sách AC để check off khi hoàn thành
- Hiểu rõ scope của task

---

## 2️⃣ API Contract

### Làm gì?
- Xác nhận **API endpoints** cần thiết:
  - **Path**: `/api/v1/documents`
  - **Method**: `GET`, `POST`, `PUT`, `DELETE`
  - **Request Body**: Schema + validation rules
  - **Response**: Success (200/201) và Error (400/403/404/500)
- Kiểm tra file `docs/api-spec.md` hoặc tương tự
- **Thêm vào spec** nếu API mới chưa có document

### Ví dụ:
```markdown
### POST /api/v1/documents
**Request Body**:
```json
{
  "title": "string (required)",
  "document_type_id": "number (required)",
  "department_id": "number (optional)",
  "visibility_scope": "public|department|private"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Công văn 001",
    "document_number": "CV-2025-001",
    "status": "draft"
  }
}
```

**Response 400** (Validation Error):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "document_type_id is required"
  }
}
```
```

### Output:
- API spec đầy đủ cho task
- Contract rõ ràng giữa frontend-backend

---

## 3️⃣ Database Schema

### Làm gì?
- Kiểm tra **ERD.md** - source of truth cho database
- Quyết định:
  - **Reuse** existing tables/fields?
  - **Migration** cần thiết? (thêm field, table, index, constraint)
- Nếu cần migration:
  - Tạo file migration: `backend/prisma/migrations/YYYYMMDD_description/migration.sql`
  - Update `backend/prisma/schema.prisma`
  - Chạy: `npx prisma db push` hoặc `npx prisma migrate dev`

### Ví dụ Migration:
```sql
-- backend/prisma/migrations/20251122_add_department_to_documents/migration.sql
ALTER TABLE documents 
ADD COLUMN department_id INTEGER REFERENCES departments(id);

CREATE INDEX idx_documents_department ON documents(department_id);
```

### Checklist:
- [ ] Có cần thêm table/field mới?
- [ ] Có cần index cho performance?
- [ ] Có cần foreign key constraint?
- [ ] Có cần unique constraint? (nhớ multi-tenant: `(tenant_id, field)`)
- [ ] Migration đã test trên local DB?

### Output:
- Schema updated
- Migration file (nếu có)
- **Ghi lại command đã chạy** để dev khác sync

---

## 4️⃣ Security

### Làm gì?
Kiểm tra **5 lớp bảo mật**:

#### 4.1. Tenant Isolation
```typescript
// ✅ ĐÚNG: Luôn filter theo tenant_id
const documents = await prisma.documents.findMany({
  where: { 
    tenant_id: user.tenant_id,  // ← BẮT BUỘC
    status: 'active'
  }
});

// ❌ SAI: Thiếu tenant_id → leak data cross-tenant
const documents = await prisma.documents.findMany({
  where: { status: 'active' }
});
```

#### 4.2. Authentication Guard
```typescript
// routes.ts
router.get('/', authGuard, controller.list);  // ← BẮT BUỘC authGuard
```

#### 4.3. Permission Check
```typescript
// routes.ts
router.post('/', authGuard, requirePermission('documents:create'), controller.create);
router.delete('/:id', authGuard, requirePermission('documents:delete'), controller.delete);
```

#### 4.4. Không Leak Sensitive Data
```typescript
// ❌ SAI: Trả về OTP/token/password
return { otp: '123456', token: 'secret' };

// ✅ ĐÚNG: Không trả về sensitive data
return { message: 'OTP sent to email' };
```

#### 4.5. Upload Limits
```typescript
// ✅ File size limit
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ✅ File type whitelist
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ✅ Sanitize filename
const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
```

### Checklist:
- [ ] Có `tenant_id` filter ở mọi query?
- [ ] Có `authGuard` ở mọi protected route?
- [ ] Có permission check cho sensitive operations?
- [ ] Không leak OTP/token/password trong response?
- [ ] Upload có limit size/type?
- [ ] Filename có sanitize?

---

## 5️⃣ Frontend Implementation

### Làm gì?
Implement UI với **6 yếu tố**:

#### 5.1. Routes
```typescript
// app/(dashboard)/documents/page.tsx
// app/(dashboard)/documents/[id]/page.tsx
```

#### 5.2. Components
```typescript
// components/documents/DocumentList.tsx
// components/documents/DocumentForm.tsx
// components/ui/button.tsx (reuse)
```

#### 5.3. Loading States
```typescript
const { data, isLoading, error } = useQuery(['documents'], fetchDocuments);

if (isLoading) return <Skeleton />;
if (error) return <ErrorState message={error.message} />;
```

#### 5.4. Error States
```typescript
// User-friendly Vietnamese messages
const ERROR_MESSAGES = {
  'VALIDATION_ERROR': 'Dữ liệu không hợp lệ',
  'PERMISSION_DENIED': 'Bạn không có quyền thực hiện thao tác này',
  'NOT_FOUND': 'Không tìm thấy tài liệu'
};
```

#### 5.5. Form Validations
```typescript
const schema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  document_type_id: z.number().min(1, 'Vui lòng chọn loại văn bản'),
  file: z.instanceof(File).refine(
    (file) => file.size <= 10 * 1024 * 1024,
    'File không được vượt quá 10MB'
  )
});
```

#### 5.6. Translations (Vietnamese)
```typescript
// Tất cả UI text phải tiếng Việt
<Button>Tạo mới</Button>
<Label>Tiêu đề văn bản</Label>
<ErrorMessage>Vui lòng nhập đầy đủ thông tin</ErrorMessage>
```

### Checklist:
- [ ] Routes đã tạo?
- [ ] Components có loading/error states?
- [ ] Form có validation?
- [ ] Error messages user-friendly (tiếng Việt)?
- [ ] UI responsive (mobile/tablet/desktop)?
- [ ] Có empty states (khi chưa có data)?

---

## 6️⃣ Testing

### Làm gì?
Test **2 layers**:

#### 6.1. API Testing (DEV1 - Backend)
```javascript
// backend/scripts/test-documents-api.js
const tests = [
  { name: 'Create document', method: 'POST', path: '/documents', body: {...} },
  { name: 'List documents', method: 'GET', path: '/documents' },
  { name: 'Get document by ID', method: 'GET', path: '/documents/1' },
  { name: 'Update document', method: 'PUT', path: '/documents/1', body: {...} },
  { name: 'Delete document', method: 'DELETE', path: '/documents/1' },
  { name: 'Permission denied', method: 'DELETE', path: '/documents/2', expectStatus: 403 }
];
```

**Chạy test**:
```bash
cd backend
node scripts/test-documents-api.js
```

#### 6.2. UI Testing (DEV2 - Frontend - Optional)
```typescript
// frontend/tests/documents.spec.ts (Playwright)
test('User can create document', async ({ page }) => {
  await page.goto('/documents');
  await page.click('text=Tạo mới');
  await page.fill('[name="title"]', 'Test Document');
  await page.selectOption('[name="document_type_id"]', '1');
  await page.click('text=Lưu');
  await expect(page.locator('text=Tạo thành công')).toBeVisible();
});
```

#### 6.3. Seed Data
```javascript
// backend/scripts/seed-documents-test.js
async function seedTestData() {
  // Tạo 10 documents mẫu
  for (let i = 1; i <= 10; i++) {
    await prisma.documents.create({
      data: {
        title: `Document ${i}`,
        tenant_id: 1,
        created_by: 1,
        document_type_id: 1
      }
    });
  }
}
```

### Checklist:
- [ ] API test script đã tạo?
- [ ] Test cases cover happy path + error cases?
- [ ] Seed data đã tạo cho testing?
- [ ] Test đã chạy và pass 100%?

---

## 7️⃣ Documentation & Logging

### Làm gì?
Update **3 files** sau mỗi task:

#### 7.1. AGENTS.md
```markdown
## 📝 Session Log: 2025-11-22 - Document Visibility Complete

**Developer**: Kiro (AI Assistant)
**Duration**: ~45 minutes
**Focus**: Implement department-based document visibility

### ✅ Completed
- Database migration: Added department_id to documents
- Access control logic: Department-based filtering
- Backend integration: Service + Controller + Routes
- Testing: 8/8 tests passed

### 📊 Stats
- Files modified: 4
- Lines of code: ~150
- Tests: 8/8 passed
- Time: 45 minutes

### 🔧 Commands Run
```bash
# Migration
cd backend
npx prisma db push

# Seed data
node scripts/seed-documents-test.js

# Test
node scripts/test-department-visibility.js
```

### 📦 New Libraries
```bash
# None for this task
```

### 🔜 Next Steps
- Add department filter to frontend
- Add department hierarchy support
```

#### 7.2. CHANGELOG.md (hoặc tạo mới)
```markdown
## [2025-11-22] - Document Visibility

### Added
- Department-based document visibility
- Access control logic in `documents.access.ts`
- Migration: `20251122_add_department_to_documents`

### Changed
- `documents.service.ts`: Added department filtering
- `documents.controller.ts`: Accept department_id in request

### API Changes
- `POST /api/v1/documents`: Added `department_id` field (optional)
- `GET /api/v1/documents`: Now filters by user's department

### Database
- Added `department_id` to `documents` table
- Added index: `idx_documents_department`

### Security
- Users can only see documents in their department
- Admin can see all departments
- Public documents visible to all
```

#### 7.3. Task-specific Report
```markdown
# docs/dev/FEATURE-DEPARTMENT-VISIBILITY-COMPLETE.md

## Overview
Implement department-based document visibility...

## Implementation Details
...

## Testing Results
8/8 tests passed ✅

## Migration Commands
```bash
cd backend
npx prisma db push
node scripts/seed-documents-test.js
```

## Files Changed
- backend/prisma/schema.prisma
- backend/src/modules/documents/documents.access.ts
- backend/src/modules/documents/documents.service.ts
- backend/src/modules/documents/documents.controller.ts
```

### Checklist:
- [ ] AGENTS.md updated với session log?
- [ ] CHANGELOG.md updated với changes?
- [ ] Task report created (FEATURE-*.md)?
- [ ] **Migration commands** documented?
- [ ] **Seed commands** documented?
- [ ] **New libraries** documented (nếu có)?
- [ ] Files changed listed?
- [ ] API changes documented?
- [ ] TODO items noted (nếu có)?

---

## 🎯 Tại Sao Cần Checklist Này?

### 1. **Đồng Bộ Giữa Devs**
- Dev2 pull code từ Dev1 → biết chính xác commands cần chạy
- Không bị lỗi "missing migration" hay "missing seed data"

### 2. **Onboarding Nhanh**
- Dev mới join → đọc AGENTS.md → hiểu ngay project history
- Không cần hỏi "làm sao setup?"

### 3. **Debugging Dễ Dàng**
- Bug xảy ra → check CHANGELOG.md → biết feature nào thay đổi gần đây
- Rollback dễ dàng nếu cần

### 4. **Security Không Bị Bỏ Sót**
- Checklist bắt buộc check tenant_id, authGuard, permissions
- Giảm thiểu lỗ hổng bảo mật

### 5. **Quality Assurance**
- Test coverage đầy đủ (API + UI)
- Seed data sẵn sàng cho testing

---

## 📝 Template Nhanh

Copy template này khi bắt đầu task mới:

```markdown
# Task: [Tên Task]

## 1. Acceptance Criteria
- [ ] AC 1
- [ ] AC 2
- [ ] AC 3

## 2. API Contract
- Endpoint: 
- Method: 
- Request: 
- Response: 

## 3. Database
- [ ] Migration needed? (Yes/No)
- [ ] Migration file: 
- [ ] Command: `npx prisma db push`

## 4. Security Checklist
- [ ] tenant_id filter
- [ ] authGuard
- [ ] Permission check
- [ ] No sensitive data leak
- [ ] Upload limits (if applicable)

## 5. Frontend
- [ ] Routes created
- [ ] Components created
- [ ] Loading/Error states
- [ ] Form validation
- [ ] Vietnamese translations

## 6. Testing
- [ ] API test script
- [ ] Seed data script
- [ ] Tests passed: X/X

## 7. Documentation
- [ ] AGENTS.md updated
- [ ] CHANGELOG.md updated
- [ ] Task report created
- [ ] Commands documented
- [ ] New libraries documented

## Commands Run
```bash
# Migration
cd backend
npx prisma db push

# Seed
node scripts/seed-xxx.js

# Test
node scripts/test-xxx.js
```

## New Libraries
```bash
# None
# OR
npm install package-name
```

## Files Changed
- backend/...
- frontend/...

## Next Steps
- [ ] TODO 1
- [ ] TODO 2
```

---

## 🚀 Quick Reference

**Trước khi commit**:
```bash
# 1. Check TypeScript errors
npm run type-check

# 2. Run tests
node scripts/test-xxx.js

# 3. Update docs
# - AGENTS.md
# - CHANGELOG.md
# - Task report

# 4. Commit với message rõ ràng
git commit -m "feat: Add department-based document visibility

- Added department_id to documents table
- Implemented access control logic
- 8/8 tests passed

Migration: npx prisma db push
Seed: node scripts/seed-documents-test.js"
```

**Khi pull code từ teammate**:
```bash
# 1. Pull code
git pull

# 2. Đọc AGENTS.md → tìm session log gần nhất

# 3. Chạy migrations
cd backend
npx prisma db push

# 4. Chạy seeds (nếu có)
node scripts/seed-xxx.js

# 5. Install new libraries (nếu có)
npm install

# 6. Start servers
npm run dev
```

---

## ✅ Kết Luận

Checklist này giúp:
- ✅ Code quality cao
- ✅ Security đảm bảo
- ✅ Team sync dễ dàng
- ✅ Onboarding nhanh
- ✅ Debugging hiệu quả

**Áp dụng cho MỌI task** - không bỏ qua bước nào! 🎯
