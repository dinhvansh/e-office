# Khuyến nghị refactor kiến trúc (tóm tắt)

Tài liệu này liệt kê các mùi kiến trúc chính và đề xuất hướng cải thiện.

---

## 1. Mùi kiến trúc chính

- **Không đồng nhất về xử lý lỗi**:
  - Nhiều module (auth, documents, signRequests, signers, ...) dùng `ApiError` + `asyncHandler` + `errorHandler`.
  - Một số module mới (`documentTypes`, `numbering`) dùng `try/catch` thủ công và `new Error()` → format lỗi, HTTP status không đồng nhất.

- **RBAC chưa áp dụng đồng đều**:
  - `users.routes.ts` đã dùng `requirePermission`.
  - `departments.routes.ts`, `roles.routes.ts` chỉ dùng `authGuard`, chưa có `requirePermission`.

- **Service phụ thuộc trực tiếp Prisma**:
  - `signers.service.ts` vừa dùng repository, vừa gọi `prisma.sign_requests` và `prisma.documents` trực tiếp.

- **E‑Office metadata chưa tham gia vào flow documents**:
  - Schema `documents` đã có `document_type_id`, `document_number`, `numbering_rule_id`,... nhưng `DocumentsService.createDocument` không set các field này.

- **Frontend dùng API & auth không thống nhất**:
  - Phần lớn trang dùng `useAuth().fetchJson`.
  - `document-types/page.tsx` tự đọc `localStorage.getItem('token')` (không dùng `AuthProvider`), dễ lệch format session.

---

## 2. Đề xuất refactor ngắn hạn

1. **Chuẩn hóa lỗi cho `documentTypes` & `numbering`**
   - Dùng `ApiError` thay cho `new Error`.
   - Bỏ `try/catch` trong controller, bọc bằng `asyncHandler`, để `errorHandler` xử lý chung.

2. **Bổ sung `requirePermission` cho routes còn thiếu**
   - `departments`: áp dụng `departments:read/create/update/delete`.
   - `roles`: áp dụng nhóm permission cho quản trị role/permission (vd. `roles:*` hoặc `settings:*`).

3. **Refactor `signers.service.ts`**
   - Thêm hàm trong `signRequests.repository.ts` và `documents.repository.ts` để cập nhật status.
   - Thay các truy vấn Prisma trực tiếp bằng repository để giảm coupling với ORM.

4. **Chuẩn hóa frontend `document-types` page**
   - Dùng `const { fetchJson } = useAuth()` thay vì `localStorage.getItem('token')`.
   - Đưa interface `DocumentType` vào `frontend/lib/types.ts` hoặc file `types` riêng.

---

## 3. Đề xuất trung hạn (E‑Office foundation)

- **Gắn document types & numbering vào `DocumentsService.createDocument`**:
  - Cho phép truyền `document_type_id` (và metadata cơ bản) từ frontend.
  - Nếu loại văn bản yêu cầu đánh số:
    - Gọi `numberingService.generateDocumentNumber(...)`.
    - Lưu `document_number`, `numbering_rule_id` trong `documents`.

- **Tách rõ domain E‑Signature vs E‑Office**:
  - Dùng các bảng workflow (`workflows`, `workflow_steps`, `document_approvals` trong ERD) để triển khai engine duyệt văn bản.
  - Dần dần unify signRequests/workflow thay vì tạo 2 khái niệm tách rời.

---

## 4. Đề xuất dài hạn

- Chuẩn hóa trạng thái (status) giữa `documents`, `sign_requests`, workflow documents.
- Tách template email/webhook ra khỏi logic gửi/emit để dễ bảo trì, mở rộng i18n.
- Tăng test coverage:
  - Unit test cho `documents`, `signRequests`, `signers`, `numbering`.
  - E2E test thêm các flow E‑Office (document types, numbering, RBAC).

