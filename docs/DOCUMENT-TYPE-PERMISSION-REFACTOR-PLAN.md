# Kế Hoạch Refactor Phân Quyền Theo Loại Văn Bản

## Mục tiêu
Refactor phần cấu hình phân quyền trong màn `Loại văn bản` để:

- tách rõ `hiển thị & bảo mật`, `quyền thao tác mặc định`, `quyền nâng cao`
- dễ hiểu với admin
- dễ debug khi kiểm tra vì sao một user có hoặc không có quyền
- không làm vỡ logic hiện tại đang chạy
- giữ tương thích ngược với dữ liệu policy cũ

## Hiện trạng codebase

### Policy loại văn bản
- Đang lưu trong `tenant_settings`
- Key hiện tại: `doc_type_policy:{documentTypeId}`
- File chính:
  - `backend/src/modules/settings/settings.service.ts`
  - `backend/src/modules/settings/settings.controller.ts`

### UI loại văn bản
- Màn `/document-types` đang gộp nhiều ý vào cùng một form
- File:
  - `frontend/app/(dashboard)/document-types/page.tsx`

### Snapshot quyền khi tạo document
- Khi tạo document, hệ thống đã đọc policy loại văn bản và snapshot một phần sang document
- Các phần đang có:
  - `visibility_scope`
  - `confidential_level`
  - `department_id`
  - baseline ACL từ `detail_permissions`
- File:
  - `backend/src/modules/documents/documents.service.ts`

### Resolver quyền hiện tại
- Logic quyền đang nằm chủ yếu trong:
  - `backend/src/modules/authorization/authorization.service.ts`
  - `backend/src/modules/documents/permissions.service.ts`
- Chưa có service riêng kiểu `resolveDocumentPermission(...)`
- Chưa trả về đầy đủ `final permissions + reasons`

## Mục tiêu nghiệp vụ sau refactor

### 1. Tách rõ 3 section trong UI

#### Section 1. Thiết lập hiển thị & bảo mật mặc định
Mục đích:
- xác định document mới tạo thuộc phạm vi truy cập nào
- xác định document mới tạo có mức bảo mật nào
- đây chưa phải là quyền thao tác chi tiết

Field mục tiêu:
- `default_visibility_scope`
  - `PRIVATE`
  - `CREATOR_ONLY`
  - `DEPARTMENT`
  - `DEPARTMENT_AND_MANAGER`
  - `WORKFLOW_ONLY`
  - `COMPANY`
  - `CUSTOM_ACL`
- `default_security_level`
  - `NORMAL`
  - `INTERNAL`
  - `CONFIDENTIAL`
  - `SECRET`
- `auto_assign_creator_department`
- `force_private_on_create`

Rule:
- nếu `force_private_on_create = true` thì `default_visibility_scope` bị ghi đè thành `PRIVATE`
- UI phải disable field `default_visibility_scope` khi flag này bật
- UI phải hiện note rõ: `PRIVATE đang ghi đè phạm vi truy cập mặc định`

#### Section 2. Quyền thao tác mặc định
Mục đích:
- đây là ACL template
- khi tạo document từ loại văn bản này, hệ thống tự gán các quyền mặc định vào document

Mỗi dòng quyền mục tiêu:
- `subject_type`
  - `CREATOR`
  - `CREATOR_DEPARTMENT`
  - `CREATOR_MANAGER`
  - `SPECIFIC_DEPARTMENT`
  - `SPECIFIC_ROLE`
  - `SPECIFIC_USER`
  - `WORKFLOW_PARTICIPANT`
  - `CC_USER`
- `subject_id`
- `permissions`
  - `VIEW`
  - `DOWNLOAD`
  - `EDIT`
  - `COMMENT`
  - `APPROVE`
  - `SIGN`
  - `SHARE`
  - `DELETE`
- `scope`
  - `OWN`
  - `DEPARTMENT`
  - `COMPANY`
  - `ASSIGNED_ONLY`
  - `ALL`
- `status_limit`
  - `DRAFT`
  - `REJECTED`
  - `SUBMITTED`
  - `APPROVED`
  - `SIGNED`

Rule:
- không cho `DELETE` rộng cho phòng ban hoặc toàn công ty
- `CREATOR` chỉ được `EDIT/DELETE` khi `DRAFT` hoặc `REJECTED`
- `WORKFLOW_PARTICIPANT` luôn có `VIEW` tối thiểu
- quyền `APPROVE/SIGN` thực tế vẫn phải phụ thuộc workflow

#### Section 3. Quyền nâng cao
Mục đích:
- xử lý ngoại lệ
- không thay thế ACL template mặc định

Mỗi policy:
- `name`
- `priority`
- `effect`
  - `ALLOW`
  - `DENY`
- `condition_json`
- `permission_json`
- `is_active`

Rule:
- `DENY` luôn thắng `ALLOW`
- dùng cho điều kiện đặc biệt
- ví dụ tài liệu `CONFIDENTIAL`, số tiền lớn, trạng thái đặc biệt, phòng ban đặc biệt

## Nguyên tắc triển khai

### 1. Không rewrite toàn bộ
Refactor theo hướng:
- giữ policy cũ
- thêm adapter
- từng bước đưa UI và resolver sang model mới

### 2. Giữ backward compatibility
Trong phase đầu:
- vẫn dùng `tenant_settings` làm nguồn policy
- vẫn dùng `document_permissions` làm snapshot ACL document
- vẫn đọc được `detail_permissions` cũ
- vẫn support các key cũ như:
  - `default_visibility_scope`
  - `default_confidential_level`
  - `inherit_creator_department`
  - `force_private_until_completed`
  - `allow_roles`
  - `deny_roles`
  - `allow_departments`
  - `deny_departments`
  - `min_position_level`

### 3. Chuyển dần sang model mới
Phase đầu:
- mở rộng JSON policy trong `tenant_settings`
- thêm `acl_templates`
- thêm `advanced_policies`
- map dữ liệu cũ vào shape mới qua adapter

## Thiết kế kỹ thuật đề xuất

### A. Policy adapter mới
Tạo shape policy mới trong code:

```ts
type DocumentTypePolicyV2 = {
  visibility: {
    default_visibility_scope: string;
    default_security_level: string;
    auto_assign_creator_department: boolean;
    force_private_on_create: boolean;
  };
  acl_templates: Array<{
    subject_type: string;
    subject_id?: number | null;
    permissions: string[];
    scope?: string | null;
    status_limit?: string[] | null;
    is_active?: boolean;
  }>;
  advanced_policies: Array<{
    name: string;
    priority: number;
    effect: "ALLOW" | "DENY";
    condition_json: Record<string, unknown>;
    permission_json: Record<string, unknown>;
    is_active: boolean;
  }>;
  legacy?: Record<string, unknown>;
};
```

Adapter sẽ:
- đọc policy cũ
- convert sang shape mới
- khi save sẽ lưu shape mới
- vẫn giữ dữ liệu legacy cần thiết để không làm vỡ chỗ cũ

File mục tiêu:
- `backend/src/modules/settings/settings.service.ts`
- có thể thêm helper riêng:
  - `backend/src/modules/settings/document-type-policy.helper.ts`

### B. Snapshot document khi tạo
Trong `createDocument()`:
- load `DocumentTypePolicyV2`
- áp:
  - `visibility_scope`
  - `confidential_level`
  - `department_id`
- nếu `force_private_on_create = true`
  - ép `visibility_scope = private`
- sinh `document_permissions` từ `acl_templates`
- document sau khi tạo không phụ thuộc hoàn toàn vào policy hiện tại nữa

File mục tiêu:
- `backend/src/modules/documents/documents.service.ts`

### C. Resolver quyền mới
Tạo service mới:
- `backend/src/modules/authorization/document-permission-resolver.service.ts`

Hàm chính:

```ts
resolveDocumentPermission(userId, tenantId, documentId): {
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canSign: boolean;
  canShare: boolean;
  canDelete: boolean;
  reasons: string[];
}
```

Thứ tự check:
1. Super Admin
2. Load document + document type config
3. Check visibility/security mặc định
4. Check snapshot ACL trên document
5. Check workflow participants
6. Apply advanced policies theo priority
7. `DENY` override `ALLOW`
8. Check document status
9. Trả về final permission + reasons

Sau đó:
- `authorizationService.canAccessDocument(...)` sẽ dùng resolver mới
- giữ adapter cho API cũ `read/edit/approve/share/delete`

### D. Validation rule
Frontend và backend đều phải validate:

- `force_private_on_create = true`
  - disable `default_visibility_scope` trên UI
  - backend vẫn cưỡng chế `PRIVATE`
- không cho thêm ACL template vô nghĩa
- không cho `DELETE` ở scope rộng
- `CREATOR` nếu có `EDIT/DELETE` thì phải có `status_limit`
- `WORKFLOW_PARTICIPANT` phải có `VIEW`
- policy JSON phải parse được

## Thiết kế UI mục tiêu

### Section 1. Thiết lập hiển thị & bảo mật mặc định
Mô tả:

> Cấu hình này quyết định document mới tạo thuộc phạm vi nào và có mức bảo mật nào. Đây chưa phải là quyền thao tác chi tiết.

Field:
- Phạm vi truy cập mặc định
- Mức độ bảo mật mặc định
- Tự động gán phòng ban người tạo vào document
- Luôn để riêng tư khi mới tạo

Yêu cầu UX:
- nếu bật `Luôn để riêng tư khi mới tạo`
  - disable field phạm vi
  - hiện helper text giải thích rõ

### Section 2. Quyền thao tác mặc định
Mô tả:

> Các quyền bên dưới sẽ được tự động gán cho document khi tạo từ loại văn bản này.

Gồm:
- form thêm quyền
- bảng danh sách quyền đã thêm

Cột bảng:
- Đối tượng
- Giá trị đối tượng
- Phạm vi
- Quyền
- Giới hạn trạng thái
- Thao tác

### Section 3. Quyền nâng cao
Mô tả:

> Dùng cho các điều kiện đặc biệt như tài liệu mật, số tiền lớn, phòng ban đặc biệt hoặc trạng thái đặc biệt.

Gồm:
- form thêm/sửa/xóa policy
- `priority`
- `effect`
- `condition_json`
- `permission_json`
- `is_active`

## Mapping với schema hiện tại

### Có thể dùng ngay
- `documents.visibility_scope`
- `documents.confidential_level`
- `documents.department_id`
- `document_permissions`

### Cần mở rộng về mặt code trước
- `document_permissions` hiện mới có:
  - `can_read`
  - `can_edit`
  - `can_approve`
  - `can_share`
  - `can_delete`
- chưa có:
  - `download`
  - `comment`
  - `sign`
  - `scope`
  - `status_limit_json`

### Chiến lược an toàn
Phase đầu:
- lưu đầy đủ `permissions/scope/status_limit` trong policy JSON
- snapshot xuống `document_permissions` chỉ phần nào schema hiện support
- phần `download/comment/sign` được resolver xử lý qua policy/participant/status adapter

Phase sau nếu cần:
- migrate schema để hỗ trợ đầy đủ

## Phạm vi phase 1

### Làm ngay
- refactor UI `document-types` thành 3 section
- thêm adapter policy mới
- thêm validation `force_private_on_create`
- thêm resolver riêng với `reasons`
- snapshot policy chuẩn hơn khi tạo document
- backward compatibility

### Chưa cần làm ngay
- migrate sang bảng riêng `document_type_acl_templates`
- migrate sang bảng riêng `advanced_policies`
- thay toàn bộ legacy role/department policy cũ
- UI editor JSON quá phức tạp

## Acceptance Criteria phase 1

- UI có đúng 3 section:
  - `Thiết lập hiển thị & bảo mật mặc định`
  - `Quyền thao tác mặc định`
  - `Quyền nâng cao`
- tick `Luôn để riêng tư khi mới tạo`
  - field `Phạm vi truy cập mặc định` bị disable
  - document tạo ra có `visibility_scope = PRIVATE`
- tạo document từ loại văn bản:
  - có `visibility_scope` đúng
  - có `security_level/confidential_level` đúng
  - có `owner department` đúng qua `department_id`
  - có snapshot ACL từ template
- user ngoài scope không xem được
- workflow participant xem được
- creator chỉ sửa được khi trạng thái cho phép
- `DENY` thắng `ALLOW`
- resolver trả về `reasons`

## Danh sách file dự kiến sửa

### Frontend
- `frontend/app/(dashboard)/document-types/page.tsx`
- `frontend/lib/types.ts`

### Backend
- `backend/src/modules/settings/settings.service.ts`
- `backend/src/modules/settings/settings.controller.ts`
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/documents/documents.controller.ts`
- `backend/src/modules/documents/permissions.service.ts`
- `backend/src/modules/authorization/authorization.service.ts`
- file mới dự kiến:
  - `backend/src/modules/authorization/document-permission-resolver.service.ts`
  - `backend/src/modules/settings/document-type-policy.helper.ts`

## Thứ tự triển khai đề xuất

1. Chuẩn hóa policy type + adapter legacy
2. Refactor UI thành 3 section
3. Áp rule `force_private_on_create`
4. Snapshot ACL khi tạo document
5. Tách resolver mới có `reasons`
6. Smoke test + build + Docker rebuild

## Ghi chú
- Phase đầu ưu tiên không vỡ hệ thống
- Chưa migrate schema lớn nếu chưa thật cần
- Nếu sau phase 1 policy chạy ổn, phase 2 mới cân nhắc tách bảng riêng cho ACL template và advanced policy
