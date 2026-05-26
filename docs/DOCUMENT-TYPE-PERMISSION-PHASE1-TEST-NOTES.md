# Phase 1 Test Notes

## Build
- `backend`: `npm run build` OK
- `frontend`: `npm run build` OK
- `docker compose up -d --build backend frontend` OK

## Runtime
- `eoffice-backend`: healthy
- `eoffice-frontend`: healthy

## Automated smoke tests
- Existing ACL regression script:
  - `docker exec eoffice-backend node /app/scripts/e2e-document-permissions.js`
  - Result: `PASS: document permissions E2E`
- Phase 1 document type policy script:
  - `docker exec eoffice-backend node /app/scripts/e2e-document-type-policy-phase1.js`
  - Result: `PASS: document type policy phase1 E2E`
  - Coverage:
    - `force_private_on_create`
    - snapshot `visibility_scope`
    - snapshot `confidential_level`
    - snapshot `department_id`
    - baseline ACL generated from `acl_templates`
    - creator `EDIT/DELETE` only in `DRAFT`
    - creator `EDIT/DELETE` denied in `SUBMITTED`
    - workflow participant can view
    - user outside scope cannot view
    - `DENY` advanced policy overrides `ALLOW`
    - legacy policy still works

## Manual verification checklist

### 1. force_private_on_create
1. Mở `Loại văn bản` và sửa một loại văn bản bất kỳ.
2. Trong section `Thiết lập hiển thị & bảo mật mặc định`, tick `Luôn để riêng tư khi mới tạo`.
3. Xác nhận field `Phạm vi truy cập mặc định` bị disable.
4. Lưu cấu hình.
5. Tạo document mới từ loại văn bản đó.
6. Kiểm tra document tạo ra có `visibility_scope = private`.

### 2. Creator edit only in DRAFT/REJECTED
1. Tạo document mới bởi user A từ loại văn bản có `require_approval = true` để document khởi tạo ở `draft`.
2. Gọi API `GET /documents/:id/permissions/effective` bằng user A.
3. Khi document ở `draft`, kỳ vọng:
   - `canEdit = true`
   - `canDelete = true`
4. Chuyển trạng thái document sang `submitted` hoặc `approved`.
5. Gọi lại API.
6. Kỳ vọng:
   - `canEdit = false`
   - `canDelete = false`
   - `reasons` có thông tin khóa theo status.

### 3. Workflow participant can view
1. Tạo document có workflow.
2. Đảm bảo user B là approver hoặc signer.
3. Gọi `GET /documents/:id/permissions/effective` bằng user B.
4. Kỳ vọng:
   - `canView = true`
   - `canDownload = true`
   - `reasons` có `User is workflow participant`.

### 4. User outside scope cannot view
1. Tạo document với `visibility_scope = department`.
2. Dùng user C ở phòng ban khác, không phải owner, không phải workflow participant, không có ACL grant.
3. Gọi `GET /documents/:id/permissions/effective`.
4. Kỳ vọng:
   - `canView = false`
   - `reasons` có thông tin mismatch theo visibility scope.

### 5. DENY policy overrides ALLOW
1. Trong `Loại văn bản`, thêm một advanced policy `ALLOW` cho `VIEW`.
2. Thêm một advanced policy `DENY` cùng permission và điều kiện match cùng document.
3. Tạo hoặc chọn document thuộc loại văn bản đó.
4. Gọi `GET /documents/:id/permissions/effective`.
5. Kỳ vọng:
   - `canView = false`
   - `reasons` có `Advanced policy matched`.

### 6. Legacy policy still works
1. Dùng loại văn bản cũ đã có `detail_permissions` legacy.
2. Mở màn hình sửa loại văn bản.
3. Xác nhận ACL cũ được load lên section `Quyền thao tác mặc định`.
4. Tạo document mới từ loại đó.
5. Xác nhận baseline ACL snapshot vẫn sinh ra đúng như trước.

## Notes
- Phase 1 vẫn giữ `tenant_settings` làm nguồn policy.
- `document_permissions` tiếp tục là snapshot ACL của document.
- `advanced_policies` đang được evaluate động theo cấu hình loại văn bản hiện tại.
- Workflow participant case và legacy compatibility đã có smoke test tự động; khi rollout vẫn nên giữ thêm 1 vòng manual verify trên dữ liệu thật.
