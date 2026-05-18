# SPEC-9: Document Workflow Snapshot

## Overview
Chuẩn hóa luồng `loại tài liệu -> workflow template -> draft snapshot -> editor -> send -> runtime progression`.

**Priority**: HIGH  
**Estimated Time**: 3-5 days  
**Impact**: Loại bỏ chồng chéo giữa `documents.service`, `signRequests.service`, `approvals.service`, làm rõ UX và state machine

---

## Goals
- Mỗi `loại tài liệu` có thể gắn `workflow mặc định`
- Khi chọn loại tài liệu, màn tạo phải load ra đầy đủ participant dự kiến
- Nếu workflow là `strict`, user không được đổi participant hoặc thứ tự
- Khi bấm tạo, hệ thống sinh `draft snapshot` cố định cho tài liệu đó
- `Editor` chỉ để đặt vị trí ký
- `Send` mới là điểm bắt đầu chạy luồng thật
- Approval progression và signing progression phải dùng cùng một source of truth

---

## Current Problems

### 1. Trách nhiệm bị chồng
- `documents.service.ts` đang tự tạo `sign_request` và tự kéo signer từ workflow signer steps
- `signRequests.service.ts` đang quyết định lúc send thì vào `approval` hay `signing`
- `approvals.service.ts` lại tiếp tục điều phối việc chuyển từ approval sang signing

### 2. UI và backend không cùng mental model
- Màn tạo và editor từng cùng tham gia cấu hình người ký
- Người dùng không biết màn nào là nơi chốt luồng thật

### 3. Workflow template và runtime instance bị lẫn
- Workflow template là cấu hình gốc
- Runtime lại đang phụ thuộc vào nhiều suy luận rải rác thay vì một bản snapshot cố định cho từng document

---

## Product Decision

### Rule 1: Document type owns the default workflow
- Mỗi `document_type` có thể có `default_workflow_id`
- User chọn đúng loại tài liệu thì workflow mặc định phải được load ngay

### Rule 2: Create screen is the configuration screen
- Màn `Tạo trình ký` là nơi chốt:
  - tài liệu
  - loại tài liệu
  - workflow áp dụng
  - danh sách approver/signer
  - thứ tự participant
  - CC
  - attachments

### Rule 3: Editor is not a workflow editor
- Màn `editor` chỉ để:
  - review participant đã chốt
  - gán field ký
  - lưu nháp field
  - gửi luồng

### Rule 4: Draft must be a snapshot
- Khi user bấm tạo nháp, hệ thống phải chụp lại participant plan tại thời điểm đó
- Workflow template bị sửa sau này không được làm thay đổi draft đã tạo

---

## Workflow Modes

### Strict
- Load từ workflow mặc định
- Không được sửa participant
- Không được sửa thứ tự
- Editor chỉ review + đặt field

### Flexible
- Load từ workflow mặc định
- Được sửa theo rule cho phép
- Có thể đổi participant hoặc thứ tự trước khi tạo draft
- Sau khi draft đã tạo thì editor không sửa participant nữa

### Adhoc
- Không có workflow mặc định
- User tự build participant plan tại màn tạo
- Sau khi tạo draft thì participant plan được khóa như các mode khác

---

## Target UX Flow

### Step 1: Select document type
User chọn file và loại tài liệu.

### Step 2: Resolve workflow template
Hệ thống load:
- workflow mặc định
- các bước theo thứ tự
- mỗi bước là `approver` hoặc `signer`
- participant cụ thể đã resolve nếu có thể

### Step 3: Review or customize
Tại màn tạo:
- nếu `strict`: chỉ xem
- nếu `flexible`: được sửa
- nếu `adhoc`: tự build

### Step 4: Create draft snapshot
Khi user bấm `Tạo nháp`:
- tạo document draft
- tạo sign request draft
- tạo workflow snapshot cho document đó
- tạo participant snapshot cho document đó
- chưa gửi mail
- chưa tạo pending approval runtime
- chưa activate signer runtime

### Step 5: Editor
User đặt field ký trên PDF.

### Step 6: Send
Khi user bấm `Gửi`:
- validate field
- validate participant snapshot
- xác định bước đầu tiên của workflow snapshot
- nếu bước đầu là approver: vào `pending_approval`
- nếu bước đầu là signer: vào `pending_signature`

---

## Domain Model

### Template Layer
- `document_types`
- `workflows`
- `workflow_steps`

### Draft Snapshot Layer
Đề xuất thêm một concept rõ ràng:
- `document_workflow_snapshots`
- `document_workflow_snapshot_steps`

Nếu chưa muốn thêm bảng mới ngay, có thể dùng workflow `created_for_doc` làm snapshot tạm thời, nhưng phải coi nó là runtime snapshot chứ không phải template.

### Runtime Layer
- `workflow_instances`
- `document_approvals`
- `sign_requests`
- `signers`
- `sign_request_fields`

---

## Source Of Truth

### Before Send
Source of truth là `draft snapshot`.

### After Send
Source of truth là:
- `workflow_instance + document_approvals` cho phase approval
- `sign_requests + signers` cho phase signing

Quan trọng:
- runtime phải được khởi tạo từ snapshot
- không được quay lại suy luận từ workflow template gốc nữa

---

## Runtime State Machine

### Document Status
- `draft`
- `pending_approval`
- `pending_signature`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`
- `archived`

### Sign Request Status
- `draft`
- `pending_approval`
- `pending`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`

### Signer Status
- `draft`
- `waiting_approval`
- `pending`
- `waiting_signing`
- `otp_sent`
- `signed`
- `rejected`

### Transitions

#### Draft -> Approval
Điều kiện:
- snapshot có bước đầu là `approver`

Kết quả:
- document = `pending_approval`
- sign_request = `pending_approval`
- signer draft = `waiting_approval`
- tạo `workflow_instance`
- tạo approval records cho step đầu

#### Draft -> Signing
Điều kiện:
- snapshot không có approver trước signer
- bước đầu là `signer`

Kết quả:
- document = `pending_signature`
- sign_request = `pending`
- signer đầu = `pending`
- signer sau = `waiting_signing`

#### Approval Complete -> Next Approval
Điều kiện:
- step hiện tại xong
- còn approver step tiếp theo

Kết quả:
- activate approvals của step kế tiếp

#### Last Approval Complete -> Signing
Điều kiện:
- tất cả approver steps đã xong
- còn signer steps

Kết quả:
- activate signer đầu tiên
- signer còn lại = `waiting_signing`
- document = `pending_signature`
- sign_request = `pending`

#### Last Signer Complete -> Completed
Kết quả:
- document = `completed`
- sign_request = `completed`

---

## Resolution Rules

### Participant resolution at create time
Khi load workflow lên màn tạo, hệ thống phải resolve participant cụ thể cho:
- `user`: trực tiếp
- `role`: theo rule chọn người đại diện
- `department`: theo manager hoặc rule của phòng ban
- `manager`: theo manager của người tạo document

Nếu không resolve được participant cho một step bắt buộc:
- không cho tạo draft
- trả lỗi rõ nguyên nhân

### Strict behavior
- snapshot participant phải khớp template đã resolve
- UI không cho sửa

### Flexible behavior
- snapshot khởi tạo từ template đã resolve
- user được sửa trước khi tạo draft

---

## Service Responsibilities

### documents.service
Chỉ lo:
- tạo document
- metadata
- file storage

Không nên:
- tự điều phối approval progression
- tự điều phối signing progression

### signRequests.service
Chỉ lo:
- sign request draft
- signer runtime
- token generation
- signer progression

Không nên:
- tự quyết workflow template nào phải dùng

### approvals.service
Chỉ lo:
- approval runtime
- activate approval steps
- complete/reject/request info

Không nên:
- chứa logic dựng participant từ template

### New orchestration service
Đề xuất thêm:
- `document-workflow-orchestrator.service.ts`

Service này chịu trách nhiệm:
- resolve template -> snapshot
- create draft package
- send draft package
- transition approval -> signing

---

## Refactor Plan

### Phase 1: Freeze UX contract
- Giữ `create` là nơi chốt participant
- Giữ `editor` chỉ đặt field

### Phase 2: Introduce orchestration boundary
- Tạo `document-workflow-orchestrator.service.ts`
- Di chuyển logic:
  - chọn workflow
  - resolve participants
  - draft creation
  - send transitions

### Phase 3: Snapshot-first runtime
- Runtime không đọc lại workflow template gốc
- Chỉ khởi tạo từ snapshot

### Phase 4: Clean service split
- `documents.service` bỏ logic prefill signer
- `approvals.service` bỏ nhánh orchestration không thuộc approval
- `signRequests.service` bỏ nhánh quyết định approval-vs-signing ở mức business cao

---

## Acceptance Criteria
- Chọn loại tài liệu sẽ load participant plan ngay tại màn tạo
- `strict` workflow không cho đổi participant hoặc thứ tự
- `flexible` workflow cho đổi trước khi tạo draft
- Tạo nháp xong vào editor không còn sửa participant
- Bấm gửi từ editor chỉ kích hoạt runtime, không dựng lại participant từ template
- Approval complete chuyển đúng sang signing theo snapshot
- Template bị sửa sau khi draft đã tạo không ảnh hưởng draft cũ

---

## Open Questions
- Với `role`, chọn người đại diện theo rule nào nếu có nhiều user?
- Với `department`, có luôn lấy manager hay cho cấu hình rule khác?
- `manager` step có cho tạo draft nếu creator chưa có manager không?
- Có cần cho quay lại màn tạo để sửa participant sau khi đã vào editor nhưng chưa send không?

---

## Recommended Next Tasks
1. Viết DTO/model cho `participant snapshot`
2. Tạo orchestration service
3. Refactor `create draft` path
4. Refactor `send` path
5. Cập nhật flow API contract cho frontend

---

**Status**: Proposed  
**Owner**: Product + Backend + Frontend  
**Last Updated**: 2026-05-18
