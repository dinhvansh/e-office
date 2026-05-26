# Document Permissions Plan

## Goal
- Tách rõ `Quyền tài liệu` khỏi `Vai trò hệ thống`.
- Trong `Quyền tài liệu`, có 2 chức năng:
  - `Share`: chia sẻ ngoại lệ, phát sinh, theo từng tài liệu.
  - `Quyền nền`: quyền nền ổn định hơn, áp vào từng tài liệu.
- Không dùng `role` cho quyền tài liệu mới.
- Đối tượng cấp quyền tài liệu:
  - `Người dùng`
  - `Phòng ban`
  - `Chức danh trong phòng ban`

## Product Rules
- `Vai trò hệ thống` chỉ dùng cho menu, API, thao tác hệ thống.
- `Quyền tài liệu` chỉ dùng cho truy cập tài liệu cụ thể.
- `Share` không thay thế `Quyền nền`.
- `Quyền nền` không thay thế workflow.
- Quyền tài liệu có các action:
  - `read`
  - `edit`
  - `approve`
  - `share`
  - `delete`

## Data Model Direction
- Giữ bảng `document_permissions` làm nền.
- Mở rộng để phân biệt nguồn quyền:
  - `permission_source`: `share | baseline`
- Mở rộng đối tượng:
  - `user`
  - `department`
  - `position_in_department`
- Nếu dùng `position_in_department`, cần lưu đủ:
  - `subject_type = position_in_department`
  - `subject_id = position_id`
  - `scope_department_id = department_id`

## Organizational Data Requirements
- User bắt buộc có:
  - `department_id`
  - `position_id`
- `manager_id` không bắt buộc cho tất cả user.
- User cấp cao nhất có thể để trống `manager_id`.
- Hướng chuẩn về lâu dài:
  - thêm flag ở `positions`:
    - `requires_direct_manager`
    - hoặc `is_top_level`

## Authorization Rules
- Quyền tài liệu được hợp nhất từ:
  - quyền gán trực tiếp cho user
  - quyền theo phòng ban
  - quyền theo chức danh trong phòng ban
- Explicit deny vẫn có precedence hơn explicit allow.
- Không dùng `role` mới trong document ACL.
- Các quyền cũ theo `role` chỉ giữ tạm để tương thích nếu cần migrate.

## UI / IA
- Menu `Vai trò & Quyền` sẽ có 2 tab:
  - `Quyền tài liệu`
  - `Vai trò hệ thống`
- Tab `Quyền tài liệu` có 2 section hoặc 2 tab con:
  - `Share`
  - `Quyền nền`
- Màn cấp quyền cần support:
  - chọn tài liệu
  - chọn loại đối tượng
  - chọn đối tượng cụ thể
  - tick quyền
  - xem danh sách quyền hiện có
  - thu hồi quyền

## Implementation Phases

### Phase 1
- [x] Viết tài liệu rule và checklist triển khai.
- [x] Siết create/update user:
  - [x] UI bắt buộc `phòng ban`
  - [x] UI bắt buộc `chức danh`
  - [x] backend validate `department_id`
  - [x] backend validate `position_id`
- [x] Đổi IA màn `Vai trò & Quyền` thành 2 tab:
  - [x] `Quyền tài liệu`
  - [x] `Vai trò hệ thống`

### Phase 2
- [x] Mở rộng backend `document_permissions`:
  - [x] thêm `permission_source`
  - [x] thêm support `position_in_department`
  - [x] migration dữ liệu cũ
- [x] Cập nhật `authorization.service` để resolve quyền mới.
- [x] Giữ backward compatibility cho ACL cũ nếu cần.

### Phase 3
- [x] Làm UI tab `Quyền tài liệu`:
  - [x] danh sách tài liệu
  - [x] filter/search
  - [x] xem ACL hiện tại
  - [x] form thêm `Share`
  - [x] form thêm `Quyền nền`
  - [x] thu hồi quyền

### Phase 4
- [ ] Audit và cảnh báo dữ liệu tổ chức:
  - [ ] user thiếu phòng ban
  - [ ] user thiếu chức danh
  - [ ] user thiếu quản lý trực tiếp nhưng position yêu cầu
  - [ ] phòng ban chưa có manager
- [x] E2E test quyền tài liệu.

## Test Checklist
- [x] User có quyền trực tiếp `read`.
- [x] User có quyền qua `department`.
- [x] User có quyền qua `position_in_department`.
- [ ] User vừa có allow trực tiếp vừa có deny từ nhóm.
- [x] Share và baseline cùng tồn tại.
- [x] Thu hồi share không làm mất baseline.
- [x] User thiếu `department_id` bị chặn khi tạo/sửa.
- [x] User thiếu `position_id` bị chặn khi tạo/sửa.

## Risks
- Dữ liệu user hiện tại có thể thiếu `department_id` hoặc `position_id`.
- ACL theo nhóm dễ cấp dư nếu UI không rõ scope.
- Nếu không tách `Vai trò hệ thống` và `Quyền tài liệu`, user rất dễ hiểu sai.

## Success Criteria
- Màn `Vai trò & Quyền` tách bạch quyền hệ thống và quyền tài liệu.
- User master data đủ sạch để resolve quyền theo tổ chức.
- ACL tài liệu mới chạy được mà không phụ thuộc `role`.
