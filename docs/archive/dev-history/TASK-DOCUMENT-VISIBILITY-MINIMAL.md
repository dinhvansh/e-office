# TASK: Document Visibility & Confidential Level (Minimal Implementation)

**Owner dev chính**: Kiro  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: ✅ COMPLETE (2025-11-20)  
**Phase**: 1 (Foundation) – Mini‑RBAC cho Documents

---

## 1. Mục tiêu

Giải quyết nhu cầu cơ bản: **không phải ai cũng thấy/tải được mọi tài liệu**, trước khi triển khai full workflow engine & document permissions.

Trong phạm vi **minimal** (Option 1):

- Thêm/chuẩn hoá metadata cho tài liệu:
  - `confidential_level`: mức độ mật (đã có trong schema, sẽ chuẩn hoá sử dụng).
  - `visibility_scope`: phạm vi hiển thị: `public` / `department` / `private` (tuỳ chọn và đơn giản).
- Áp dụng **filter quyền xem tài liệu** ở backend:
  - User thường chỉ thấy tài liệu thuộc phạm vi mình.
  - Admin có thể thấy tất cả.
  - Chủ sở hữu (owner) luôn thấy tài liệu của mình.
- Chuẩn bị nền tảng cho Phase 2 (full workflow & document_permissions), nhưng **không** triển khai hết 6 layer RBAC instance‑level ở task này.

Không yêu cầu:
- Chưa implement workflow‑based visibility (Case 2) – để Phase 2 (Workflow Engine).
- Chưa implement CRUD chi tiết trên `document_permissions` – để Phase RBAC nâng cao.

---

## 2. Hiện trạng & bối cảnh

### 2.1 Schema hiện tại (Prisma)

`backend/prisma/schema.prisma` – model `documents` (trích phần liên quan):

- Đã có:
  - `priority_level String? @default("normal")`
  - `confidential_level String? @default("normal")`
  - `owner_id Int?` (optional, liên kết với `users` qua relation `"documents_owner"`).
  - `tenant_id Int`
  - `document_type_id Int?`
  - `department_id` hiện **chưa** có trong schema `documents` (có `departments` riêng).

=> Có thể tận dụng `confidential_level` + `owner_id` ngay; `department_id` có thể bổ sung sau tuỳ quyết định (xem dưới).

### 2.2 Documents module hiện tại

- `documents.service.ts`:
  - `listDocuments(tenantId)` → trả tất cả documents của tenant (không filter theo user).
  - `getDocument(id, tenantId)` → check theo `tenant_id` nhưng không check `owner` hay quyền khác.
- `documents.routes.ts`:
  - `/documents` bảo vệ bởi `authGuard`, nhưng **không có** `requirePermission` và **không filter** theo user/role/department.

=> Hiện tại: **mọi user trong tenant** đều thấy toàn bộ tài liệu của tenant → không phù hợp cho tài liệu mật/confidential.

---

## 3. Yêu cầu Backend (minimal visibility)

### 3.1 Chuẩn hoá field mức độ mật & phạm vi

**Prisma schema (documents)**

- `confidential_level`:
  - Giữ kiểu `String? @default("normal")` nhưng quy ước giá trị:
    - `"normal"`
    - `"confidential"`
    - `"secret"` (hoặc `"top_secret"` nếu cần thêm, tuỳ bạn quyết LUT).
  - Sử dụng trong logic để **thắt chặt** nếu muốn (ở task minimal: chủ yếu dùng `visibility_scope` + owner/admin).

- `visibility_scope` **(mới, optional)** – chỉ thêm nếu chúng ta cần phân scope rõ hơn:
  - Kiểu đề xuất: `String? @default("public")`
  - Giá trị: `"public" | "department" | "private"` (hard‑coded trong code).
  - Nếu chưa muốn chỉnh DB lúc này, có thể **bỏ field DB**, chỉ dùng logic dựa trên owner/admin/department – nhưng spec này assume sẽ thêm để long‑term ổn định.

> Lưu ý: task này là thiết kế; khi implement, Kiro cần cập nhật `schema.prisma` + migrate (hoặc `db push`) nếu thêm `visibility_scope`.

### 3.2 Helper kiểm tra quyền xem tài liệu (canViewDocument)

**File gợi ý**: `backend/src/modules/documents/documents.service.ts` hoặc tạo file riêng `documents.access.ts`.

Pseudo‑interface:

```ts
type DocumentVisibilityScope = 'public' | 'department' | 'private' | null | undefined;
type ConfidentialLevel = 'normal' | 'confidential' | 'secret' | 'top_secret' | null | undefined;

async function canViewDocument(
  user: users,              // Prisma user record
  doc: documents,           // Prisma document record
): Promise<boolean> {
  // Layer 1: Tenant check
  if (doc.tenant_id !== user.tenant_id) return false;

  // Layer 2: Admin bypass (simple version)
  // Có thể dựa vào user.role === 'admin' hoặc check permission 'documents','admin'
  if (user.role === 'admin') return true;

  // Layer 3: Owner
  if (doc.owner_id && doc.owner_id === user.id) return true;

  // Layer 4: Visibility scope (minimal)
  const scope = (doc as any).visibility_scope as DocumentVisibilityScope ?? 'public';
  if (scope === 'public') {
    return true;
  }

  if (scope === 'department') {
    // Chỉ khi có department_id ở cả user & doc thì mới check
    if (user.department_id && (doc as any).department_id && user.department_id === (doc as any).department_id) {
      return true;
    }
  }

  if (scope === 'private') {
    // Chỉ owner + admin đã check ở trên là true; người khác = false
    return false;
  }

  // Layer 5: (Reserved cho document_permissions ở Phase 2)
  // Có thể TODO: check document_permissions khi implement full

  // Layer 6: Confidential level (minimal)
  const level = doc.confidential_level as ConfidentialLevel ?? 'normal';
  if (level === 'secret' || level === 'top_secret') {
    // Minimal: chỉ cho phép owner + admin (đã check ở trên)
    return false;
  }

  return false;
}
```

**Yêu cầu**:

- Implement một helper tương đương, nhưng có thể đơn giản hơn nếu chưa có `department_id` trên documents (có thể tạm bỏ scope `department` nếu chưa muốn thêm field).
- Mọi logic nên **dựa trên dữ liệu hiện có** (tenant, owner, role) + optional `visibility_scope` nếu thêm.

### 3.3 Áp dụng filter vào list & detail

#### 3.3.1 API `GET /documents`

**Hiện tại**: `documentsService.listDocuments(tenantId)` trả tất cả docs của tenant.

**Yêu cầu mới**:

- Thay đổi `listDocuments` để:
  - Nhận thêm `user` hoặc `userId` + load user:
    ```ts
    async listDocuments(tenantId: number, user: users): Promise<documents[]> { ... }
    ```
  - Nếu user là admin → trả full list như cũ (filter theo tenant).
  - Nếu user không phải admin:
    - Có thể dùng 2 bước (minimal, dễ implement):
      1. Query DB: tất cả documents của tenant (hoặc subset theo điều kiện thô: owner + thuộc department, nếu có field).
      2. Filter tiếp trong memory bằng `canViewDocument(user, doc)`.
    - Với số lượng tài liệu hiện tại nhỏ, filter in‑memory là chấp nhận được; Phase sau có thể tối ưu bằng query SQL phức tạp hơn.

- Update `DocumentsController.list` để truyền `req.user` (hoặc `req.auth.userId` + load user) vào service.

#### 3.3.2 API `GET /documents/:id`

- Sau khi `documentsService.getDocument(id, tenantId)` load doc:
  - Thêm bước check `canViewDocument(req.user, document)`:
    - Nếu false → ném `ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED")`.

=> Mọi truy cập document detail (và các hành động liên quan file sau này) đều bị chặn đúng.

### 3.4 Chuẩn bị cho download endpoint

- Nếu đã có hoặc sẽ thêm endpoint download (VD: `GET /documents/:id/download`):
  - **Bắt buộc** gọi lại `canViewDocument` trước khi đọc file từ `file_path` và gửi ra response.
  - Điều này đảm bảo rule “không được tải nếu không có quyền” ngay từ backend.

---

## 4. Yêu cầu Frontend (minimal)

### 4.1 Ghi nhận mức độ mật khi upload

**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Việc cần làm**:

- Thêm 1 control để chọn `confidential_level` khi upload, ví dụ:
  - `<select>` với options: `"normal"`, `"confidential"`, `"secret"`.
  - Mặc định `"normal"`.
- Khi gửi `POST /documents`, body thêm:
  - `confidential_level: selectedConfidentialLevel`.
- UI copy suggestion:
  - Nhãn: `"Mức độ mật"` với mô tả nhỏ: `"Normal (mặc định) / Confidential / Secret"`.

> Ghi chú: Backend đã có field `confidential_level`, chỉ cần nhận thêm từ request và lưu, không cần thay DB.

### 4.2 (Tuỳ chọn) Filter UI theo scope

Đối với task minimal, **backend đã filter theo quyền** nên UI có thể chỉ hiển thị những gì API trả về.

Nếu muốn dễ dùng hơn, có thể thêm 1 dropdown để user chọn:

- `"Tài liệu của tôi"` – filter local theo `doc.owner_id === currentUser.id` (UI‑side).
- `"Tất cả tài liệu tôi có thể xem"` – là default (không filter thêm, chỉ dựa trên backend).

Nhưng việc này **không bắt buộc**; focus chính là backend permission.

---

## 5. Acceptance Criteria

### 5.1 Backend

- [ ] User **không phải admin**, **không phải owner** và **không cùng tenant** không thể thấy/tải bất kỳ document nào (đã có tenant check).  
- [ ] User **không phải admin**, khác owner:
  - Với document `visibility_scope = 'public'`, `confidential_level = 'normal'` → thấy được trong list và open detail.
  - Với document `visibility_scope = 'private'` hoặc `confidential_level = 'secret'` → **không** thấy trong list, **không** mở được detail (403 với code `DOCUMENT_ACCESS_DENIED`).
- [ ] Admin:
  - Thấy được tất cả documents của tenant (như trước).
- [ ] Owner:
  - Luôn thấy được tài liệu mình upload, kể cả khi `visibility_scope = 'private'` hoặc `confidential_level = 'secret'`.
- [ ] Nếu sau này có endpoint download: khi user không đủ quyền, không tải được file (403).

### 5.2 Frontend

- [ ] Form upload `/documents` có chọn `confidential_level` với mặc định `normal`.
- [ ] Khi chọn `confidential_level = 'secret'` và upload→ document được tạo với giá trị tương ứng (kiểm tra bằng `test-api.http` hoặc DB).
- [ ] List documents hiển thị chỉ những doc mà backend trả về (không lộ doc bị chặn).

---

## 6. Test Tasks (gợi ý cho Kiro / QA)

### 6.1 Backend (REST Client / test-api.http)

1. **Case: public normal document**
   - User A upload document với `confidential_level = "normal"` và `visibility_scope = "public"` (nếu implement).
   - User B (cùng tenant, không admin, không owner) gọi `GET /documents`:
     - Thấy document trong list.
     - `GET /documents/:id` trả về success.

2. **Case: private secret document**
   - User A upload document với `confidential_level = "secret"`, `visibility_scope = "private"`.
   - User B (cùng tenant, không admin):
     - `GET /documents` KHÔNG thấy document trong list.
     - `GET /documents/:id` trả về 403 + `DOCUMENT_ACCESS_DENIED`.
   - Admin user:
     - Thấy document trong list & mở được detail.

3. **Case: owner**
   - Chủ upload (User A) luôn thấy doc mình trong list & detail, bất kể confidential/visibility.

### 6.2 Frontend (manual)

- Đăng nhập bằng 2 user khác nhau trong cùng tenant (A và B, A không phải admin, B có thể admin để test):  
  - A upload normal/public → B thấy.  
  - A upload secret/private → B không thấy; B thử đoán ID và mở detail → UI báo lỗi phù hợp (403).  
  - Admin login → vẫn thấy tất cả.

---

## 7. Ghi chú cho reviewer (GPT)

- Xác nhận Kiro **không phá vỡ** behavior hiện tại của documents cho admin.  
- Kiểm tra `documents.service.ts`:
  - Có helper tương tự `canViewDocument`.  
  - `listDocuments` & `getDocument` sử dụng helper.  
- Kiểm tra `documents.controller.ts`:
  - `list` truyền đủ user/tenant vào service.  
- Kiểm tra frontend `/documents`:
  - Form upload gửi thêm `confidential_level`.  
- Kiểm tra thêm trong `RBAC_IMPLEMENTATION_STATUS.md` nếu layer 4/5 được modify sau task này.

