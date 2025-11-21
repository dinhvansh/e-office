# TASK: RBAC cho Documents (enforce quyền đọc/xoá/sửa)

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: TODO  
**Phase**: 1 (Security/RBAC – bước tiếp theo sau visibility & file-path)

---

## 1. Mục tiêu

Sau khi đã có:
- Task **Document Visibility Minimal** (`TASK-DOCUMENT-VISIBILITY-MINIMAL.md`) – filter tài liệu theo `canViewDocument`.  
- Task **Document File Path Hardening** (`TASK-DOCUMENT-FILE-PATH-HARDENING.md`) – ẩn `file_path`, download an toàn.

Task này tập trung **siết RBAC cho module documents**:

- Mọi thao tác quan trọng trên document (list, xem chi tiết, xoá, tags, permissions, versions…) phải:
  - Đi qua **RBAC** (`requirePermission`).  
  - Tôn trọng logic **visibility** (`canViewDocument`).
- Chuẩn hoá cách hiểu “admin”:
  - Không dựa vào string role (`user.role === 'admin'`) nữa.  
  - Thay bằng permission thực sự từ hệ thống RBAC (`permissions` table).

---

## 2. Hiện trạng (tóm tắt)

- `documents.routes.ts`:
  - Dùng `authGuard` cho mọi route.  
  - Chưa dùng `requirePermission` cho CRUD documents.  

- `documents.service.ts`:
  - `listDocuments(tenantId, userId?)` + `getDocument(documentId, tenantId, userId?)` đã dùng `filterViewableDocuments` / `canViewDocument` **khi có userId**, nhưng:
    - `deleteDocument` đang gọi `getDocument(documentId, tenantId)` **không truyền userId** → delete hiện không check quyền view.  

- Các endpoint khác (`tags`, `permissions`, `versions`) mới chỉ check tenant, chưa check document‑level access.

- RBAC global (users/roles/document-types/numbering) đã hoạt động với `requirePermission`.

---

## 3. Yêu cầu Backend – RBAC cho documents

### 3.1 Thêm `requirePermission` cho routes documents

**File**: `backend/src/modules/documents/documents.routes.ts`

**Mục tiêu**: gán permission rõ cho từng nhóm endpoint. Gợi ý:

- Đọc danh sách / chi tiết:
  - `GET /documents` → `requirePermission('documents', 'read')`.  
  - `GET /documents/:id` → `requirePermission('documents', 'read')`.  
  - `GET /documents/:id/versions` / `versions/latest` → cũng cần `documents:read`.  
  - `GET /documents/:id/tags`, `GET /documents/:id/permissions` → ít nhất `documents:read`.  

- Tạo / upload document:
  - `POST /documents` → `requirePermission('documents', 'create')`.  

- Xoá document:
  - `DELETE /documents/:id` → `requirePermission('documents', 'delete')`.  

- Quản lý tags:
  - `POST /documents/:id/tags` / `DELETE /documents/:id/tags` → `requirePermission('documents', 'update')`.  

- Quản lý document permissions:
  - `POST /documents/:id/permissions` / `DELETE /documents/:id/permissions` → `requirePermission('documents', 'update')` hoặc `('documents','share')` nếu dùng resource riêng.  

- Quản lý versions:
  - `POST /documents/:id/versions` → `requirePermission('documents', 'update')`.  

> Ghi chú: dùng đúng resource/action theo cách đã seed trong `seed-rbac.js`. Nếu chưa có resource `'documents'` hoặc action tương ứng, cần sync lại với file seed (hoặc điều chỉnh mapping cho khớp).  

### 3.2 Dùng `canViewDocument` cho tất cả thao tác gắn với 1 document

Đảm bảo các hành động sau **chỉ thực hiện khi user có quyền xem document đó**:

- `getDocument` (đã có).  
- Xoá document.  
- Quản lý tags (`addTag`, `removeTag`, `getTags`, `getAllTags` liên quan đến documents).  
- Quản lý permissions (`grantPermission`, `revokePermission`, `getPermissions`).  
- Quản lý versions (`createVersion`, `getVersions`, `getLatestVersion`).  
- Endpoint download (khi implement ở task file‑path).

**Cách làm gợi ý**:

- Tạo một helper service cho document‑level access, ví dụ trong `documents.service.ts`:
  ```ts
  async ensureCanViewDocument(documentId: number, tenantId: number, userId: number): Promise<documents> {
    const document = await documentsRepository.findById(documentId, tenantId);
    if (!document) throw ApiError.notFound(...);
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.tenant_id !== tenantId) throw ApiError.notFound(...);
    if (!(await canViewDocument(user, document))) {
      throw ApiError.forbidden("You do not have access to this document", "DOCUMENT_ACCESS_DENIED");
    }
    return document;
  }
  ```

- Sau đó dùng helper này ở controller/service trước khi gọi logic tags/permissions/versions:
  - Ví dụ trong `deleteDocument`, `addTag`, `grantPermission`, `createVersion`, v.v.

> Lưu ý: `requirePermission` kiểm tra “quyền global” (documents:read/delete/...), còn `canViewDocument` kiểm tra “quyền trên tài liệu cụ thể” (tenant/scope/confidential/owner).

### 3.3 Chuẩn hoá “admin” bằng RBAC

Hiện tại `canViewDocument` sử dụng:

```ts
const userRole = (user as any).role;
if (userRole === 'Admin' || userRole === 'admin') return true;
```

**Yêu cầu** (hoặc gợi ý, tuỳ mức bạn muốn làm trong task này):

- Option minimal (ít đụng code):
  - Đảm bảo seed RBAC đặt role admin chuẩn là `"admin"` và không đổi string lung tung.  
  - Thêm comment rõ trong `canViewDocument` để sau này dễ refactor sang permission.

- Option tốt hơn (nên làm nếu thời gian cho phép):  
  - Thêm 1 permission đặc biệt, ví dụ `'documents','admin'` hoặc `'documents','manage'`.  
  - Dùng `rolesService.checkPermission(user.id, 'documents', 'manage')` trong `canViewDocument` để quyết định “admin bypass” thay vì đọc `user.role`.  
  - Để tránh circular dependency, có thể implement helper nhỏ trong docs service hoặc một dịch vụ RBAC chung.

> Nếu Option “tốt hơn” quá nặng cho một task, có thể ghi TODO rõ trong code/doc để Phase 2 refactor.

---

## 4. Yêu cầu Frontend (nhỏ)

Không bắt buộc phải đổi nhiều, vì backend đã enforce RBAC. Tuy nhiên nếu muốn UX tốt hơn:

- Ẩn hoặc disable các nút:
  - Upload document nếu user không có `documents:create`.  
  - Xoá document nếu không có `documents:delete`.  
  - Các action manage tags/permissions/versions nếu không có quyền tương ứng.  

Trong scope task này, có thể **chỉ cần** dựa vào error 403 từ backend và hiển thị toast phù hợp (“Bạn không có quyền thực hiện thao tác này”).  

---

## 5. Acceptance Criteria

### 5.1 Backend

- [ ] Các route `GET /documents` và `GET /documents/:id` yêu cầu `documents:read`.  
- [ ] `POST /documents` yêu cầu `documents:create`.  
- [ ] `DELETE /documents/:id` yêu cầu `documents:delete` và **không** cho user không có quyền view/tương tác với document xoá được tài liệu của người khác.  
- [ ] Mọi endpoint tags/permissions/versions gắn với 1 document:
  - [ ] Check `documents:<action>` phù hợp.  
  - [ ] Check `canViewDocument` (hoặc helper tương đương).  
- [ ] “Admin bypass” trong `canViewDocument` không phụ thuộc vào string role hard‑coded (hoặc có TODO rõ ràng nếu chưa refactor được ngay).

### 5.2 Frontend

- [ ] Khi user không có quyền (vd. thiếu `documents:delete`), gọi API tương ứng sẽ trả 403 và UI hiển thị toast/message hợp lý.  
- [ ] Không còn case người dùng “thường” xoá được document mà họ không nên thấy (manual test với 2 user khác nhau).

---

## 6. Test Tasks (gợi ý cho Kiro / QA)

**Chuẩn bị**:
- Seed lại RBAC (`backend/scripts/seed-rbac.js`) hoặc đảm bảo roles/permissions đã đúng.  
- Tạo ít nhất 2 user trong cùng 1 tenant:
  - User A: có quyền documents full (admin hoặc có `documents:read/create/update/delete`).  
  - User B: chỉ có một số quyền hạn chế (vd. chỉ read).

**Test cases**:

1. User B không có `documents:delete`:
   - `DELETE /documents/:id` → 403 (`Permission denied: documents:delete`).  

2. User B có `documents:delete` nhưng **không có quyền view** document của tenant khác/owner khác (tùy visibility):
   - Document của A là secret/private.  
   - B gọi `DELETE /documents/:id` → 403 `DOCUMENT_ACCESS_DENIED` (hoặc kết hợp permission).  

3. User A (admin/documents manage):
   - Thực hiện được tất cả actions (list, create, delete, manage permissions/versions) theo expected.  

4. Tags/permissions/versions:
   - User không có quyền tương ứng → không thao tác được, backend trả lỗi chuẩn.  
   - User có quyền → thao tác ok.

---

## 7. Ghi chú cho reviewer (GPT)

- Kiểm tra `documents.routes.ts` xem đã gắn đủ `requirePermission` chưa (read/create/update/delete).  
- Kiểm tra `documents.service.ts` / `documents.controller.ts`:
  - Xem helper access‑check được dùng trước khi delete/tags/permissions/versions.  
- Kiểm tra `canViewDocument` để xác nhận “admin bypass” không cứng bằng string role về lâu dài (hoặc tối thiểu được đánh dấu TODO rõ).  
- Có thể cập nhật `RBAC_IMPLEMENTATION_STATUS.md` sau khi task này xong, đánh dấu Layer “Permission enforcement per resource” và “Document instance‑level prep” đã tiến thêm một bước.

