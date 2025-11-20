# RBAC Implementation Status Snapshot (for AI assistants)

**Last synced with code**: 2025-11-19  
**Related spec**: `docs/RBAC_FULL_SPEC_FULL.md` (full target design)  
**Scope**: Backend (Prisma + Express), Frontend (Next.js), DB schema

---

## 1. Overview table by RBAC layer

| Layer / Feature                        | DB schema | Backend logic                 | Frontend / UI              | Status       | Notes (current code) |
|----------------------------------------|-----------|-------------------------------|----------------------------|-------------|----------------------|
| 1. Tenant isolation                    | Yes       | Yes (`authGuard`, repos)      | Implicit (per-tenant data) | IMPLEMENTED  | Mọi bảng chính có `tenant_id`, JWT chứa `tenantId`, repository đều filter theo tenant. |
| 2. Roles & permissions (global scope)  | Yes       | Yes (`roles`, `permissions`, `requirePermission`) | Partially (chưa ẩn menu theo quyền) | IMPLEMENTED (core) | Module `roles`, bảng `permissions`, middleware `requirePermission` đã dùng cho users, document-types, numbering, v.v. |
| 3. Permission enforcement per resource | Yes       | Yes (resource/action checks)  | Partially                  | IMPLEMENTED (backend) | Hầu hết API admin đã chặn theo permission; UI vẫn chưa điều chỉnh hiển thị theo permission. |
| 4. Department hierarchy                | Yes       | CRUD + tree only              | Yes (`/departments` page)  | PARTIAL      | Cây phòng ban có schema + UI; chưa áp dụng rule xem/chỉnh sửa documents theo department tree. |
| 5. Document instance‑level permissions | Yes       | Not yet                       | Not yet                    | PLANNED      | Bảng `document_permissions` đã có, nhưng chưa có service/middleware sử dụng. |
| 6. Workflow‑step permissions           | Partial (ERD only) | Not yet                  | Not yet                    | PLANNED      | Workflow engine theo spec (WORKFLOW, WORKFLOW_STEPS, DOCUMENT_APPROVALS) chưa implement; hiện chỉ có `sign_requests`/`signers` cho e‑signature đơn giản. |

---

## 2. Mapping sang code hiện tại

### 2.1 Tenant isolation (Layer 1)

- **DB**:  
  - Bảng có `tenant_id`: `tenants`, `users`, `documents`, `sign_requests`, `departments`, `roles`, `document_types`, `numbering_rules`, `external_organizations`, v.v.
- **Backend**:  
  - `authGuard` (file `backend/src/modules/auth/auth.middleware.ts`) đọc JWT, gán `req.auth.tenantId`.  
  - Repository các module luôn filter theo `tenant_id` (ví dụ `documentsRepository.listByTenant(tenantId)`).
- **Frontend**:  
  - Không có khái niệm “đổi tenant” trong UI; mỗi session gắn với một tenant duy nhất (từ token).

=> Có thể coi Layer 1 **đã triển khai ổn định**, là nền cho các layer còn lại.

### 2.2 Roles & permissions (Layers 2–3, global scope)

- **DB**:  
  - Bảng: `roles`, `permissions`, `role_permissions`, `user_roles`.  
  - Mô hình đúng với spec: user có nhiều role, role có nhiều permission (resource + action).
- **Backend**:  
  - Module `roles` quản lý CRUD role + load permissions.  
  - Middleware `requirePermission(resource, action)` trong `backend/src/middleware/permission.ts`:
    - Dùng `rolesService.checkPermission(userId, resource, action)`.  
    - Trả 401/403 khi thiếu quyền.  
  - Đã áp dụng cho nhiều route quan trọng: users, document-types, numbering, v.v.
- **Frontend**:  
  - Chưa có chi tiết ẩn/hiện nút/menu theo permission; UI chủ yếu dựa trên việc API trả về 401/403 nếu thiếu quyền.

=> Core RBAC global **đã usable**, nhưng chưa có “UI permission map” như spec mô tả.

### 2.3 Department hierarchy (Layer 4)

- **DB**:  
  - Bảng `departments` với quan hệ parent/children, manager, v.v.
- **Backend**:  
  - Module `departments` hỗ trợ CRUD + tree (`/departments`, `/departments/tree`).  
  - Chưa có code enforce quyền theo department tree lên documents/workflows.
- **Frontend**:  
  - Trang `/departments` hiển thị cây phòng ban, cho phép quản lý.

=> Layer 4 hiện ở trạng thái **PARTIAL**: dữ liệu + UI có, nhưng rules “user chỉ thấy tài liệu của department mình + con” chưa hiện diện trong code.

### 2.4 Document instance‑level permissions (Layer 5)

- **DB**:  
  - Bảng `document_permissions` với các flag `can_read`, `can_edit`, `can_approve`, `can_share`, `can_delete`,... và `subject_type` (USER/ROLE/DEPARTMENT).
- **Backend**:  
  - Chưa có module/service nào đọc và áp dụng bảng này khi list/get/edit documents.
- **Frontend**:  
  - Không có UI để gán permission instance‑level cho document.

=> Layer 5 hiện **mới ở mức schema**, chuẩn bị cho Phase RBAC nâng cao.

### 2.5 Workflow‑step permissions (Layer 6)

- **DB / ERD**:  
  - ERD (`ERD.md`) mô tả `WORKFLOW`, `WORKFLOW_STEPS`, `DOCUMENT_APPROVALS`, v.v.  
  - Prisma schema hiện tại **chưa** có đầy đủ các bảng này, mới có e‑signature `sign_requests` + `signers`.
- **Backend / Frontend**:  
  - Chưa có workflow engine; chỉ có flow ký đơn giản dựa trên `sign_requests`.

=> Layer 6 **chưa triển khai**, gắn với Phase 2+ trong roadmap.

---

## 3. Gợi ý dùng doc này cho AI / task

- Khi tạo task mới về RBAC:
  - **Luôn chỉ rõ** task đụng vào layer nào (1–6) và trạng thái hiện tại (Implementation Status).  
  - Dùng `RBAC_FULL_SPEC_FULL.md` làm chuẩn nghiệp vụ, và file này làm “bản đồ” những gì đã có / chưa có trong code.
- Khi review hoặc refactor:
  - Ưu tiên củng cố Layer 1–3 (tenant + roles/permissions + enforcement) trước khi build Layer 4–6.  
  - Mọi thay đổi liên quan permission nên được phản ánh lại vào bảng ở phần 1 để AI/dev khác nắm nhanh.  

---

_Note: File này không thay thế `RBAC_FULL_SPEC_FULL.md`, mà chỉ là lớp “meta” giúp AI và dev định vị nhanh status so với spec._

