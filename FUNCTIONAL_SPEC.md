# Functional Specification

## 1. Mục tiêu

E-Office là hệ thống quản lý tài liệu nội bộ với 3 phần chính:

- quản lý tài liệu và metadata
- luồng phê duyệt nhiều bước
- luồng ký điện tử nội bộ và bên ngoài

## 2. Vai trò chính

- `Admin`: toàn quyền cấu hình hệ thống, người dùng, role, workflow
- `Manager`: xem và xử lý công việc phê duyệt, quản lý dữ liệu nghiệp vụ được cấp quyền
- `User`: tạo tài liệu, gửi duyệt, tạo yêu cầu ký, xử lý phần việc được giao
- `Viewer`: chỉ xem dữ liệu được cấp phép

## 3. Module hiện có

- Authentication
- Users
- Departments
- Positions
- Roles & Permissions
- Document Types
- Workflows
- Documents
- Sign Requests
- Approvals
- External Organizations
- Notifications
- Audit Logs
- Webhooks
- License validation

## 4. Mô hình dữ liệu nghiệp vụ

### Document

Đại diện cho một tài liệu nghiệp vụ.

Thuộc tính quan trọng:

- loại văn bản
- số văn bản
- người tạo
- phòng ban
- trạng thái
- file gốc
- file đã ký

### Sign Request

Đại diện cho một quy trình ký gắn với document.

Thuộc tính quan trọng:

- document liên kết
- trạng thái luồng ký
- danh sách signer
- field ký trên PDF

### Approval

Đại diện cho từng bước phê duyệt trong workflow.

## 5. Trạng thái chính

### Document status

- `draft`
- `pending_approval`
- `pending_signature`
- `completed`
- `rejected`
- `cancelled`
- `archived`

### Sign request status

- `draft`
- `pending_approval`
- `pending`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`

### Signer status

- `draft`
- `waiting_approval`
- `pending`
- `waiting_signing`
- `otp_sent`
- `signed`
- `rejected`

## 6. Flow nghiệp vụ chuẩn

### 6.1 Tạo yêu cầu ký

1. User vào `/sign-requests/create`
2. Upload file
3. Chọn loại văn bản
4. Chọn workflow nếu cần approval
5. Có thể thêm signer bên ngoài ngay từ bước tạo
6. Hệ thống tạo:
   - `document`
   - `sign_request`
7. Cả hai ở trạng thái `draft`

### 6.2 Hoàn thiện editor

Tại màn `/sign-requests/:id/editor`, người tạo:

- thêm hoặc sửa signer
- đặt field ký
- lưu nháp nhiều lần

### 6.3 Gửi quy trình

Khi bấm gửi:

- nếu loại văn bản cần approval:
  - sign request chuyển `pending_approval`
  - document chuyển `pending_approval`
  - workflow instance và approval records được tạo
- nếu không cần approval:
  - signer đầu tiên được kích hoạt
  - sign request chuyển `pending`
  - document chuyển `pending_signature`

### 6.4 Phê duyệt

- approver xử lý tại `/my-tasks` hoặc `/approvals/:id`
- khi tất cả bước duyệt hoàn tất:
  - nếu có signer thì kích hoạt pha ký
  - nếu không có signer thì document hoàn tất

### 6.5 Ký

- signer nội bộ thấy việc tại `/my-tasks`
- signer bên ngoài nhận link + OTP qua email
- ký tuần tự theo `signing_order`
- signer cuối ký xong thì:
  - sign request `completed`
  - document `completed`

## 7. Phân biệt approver và signer

- `approver` là người duyệt nội dung
- `signer` là người ký trên tài liệu

Một workflow có thể:

- chỉ có approver
- chỉ có signer
- hoặc có cả hai

Nếu workflow chỉ có approver, editor sẽ không có signer tự sinh ra để gán field ký.

## 8. Permission model

RBAC dùng bảng:

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

Quyền được kiểm tra qua `requirePermission(resource, action)`.

Riêng `super_admin` có bypass ở permission engine.

## 9. My Tasks

Màn `/my-tasks` gộp 2 loại việc:

- approval tasks
- signing tasks

Điều kiện hiển thị:

- approval task: user là `approver_user_id`
- signing task: user là signer nội bộ với trạng thái đến lượt xử lý

## 10. Giới hạn hiện tại

- frontend build hiện còn bỏ qua lint/type-check trong cấu hình build
- tài liệu lịch sử trong `docs/` rất nhiều, không nên coi là nguồn sự thật
- workflow mẫu seed chủ yếu là approval workflow; muốn auto sinh signer từ workflow thì step phải có `participant_role = signer`
