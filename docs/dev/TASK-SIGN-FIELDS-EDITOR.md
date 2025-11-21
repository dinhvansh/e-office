# TASK: Ký điện tử – Editor trường dữ liệu & UI người ký

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: TODO  
**Phase**: 2 – E‑Sign Envelope & Workflow

---

## 1. Mục tiêu

Xây dựng **editor trường dữ liệu** cho trình ký điện tử (giống mock bạn gửi) và **UI cho người ký** để điền/ ký vào các trường đó.

Flow mong muốn:

1. Người tạo (sender) chọn loại văn bản, chọn luồng ký/phê duyệt, upload tài liệu (PDF/DOCX).  
2. Hệ thống tạo `sign_request` ở trạng thái `draft` + danh sách signer.  
3. Sender mở màn hình “Trình ký điện tử”:
   - Panel người ký bên trái.
   - Viewer PDF ở giữa.
   - Palette “Trường dữ liệu” (Chữ ký, Họ tên, Ngày ký, Checkbox…) để kéo thả lên PDF, gán cho từng signer.
4. Sender bấm “Gửi yêu cầu ký” → hệ thống gửi email/OTP cho signer, workflow chạy như hiện tại.  
5. Người ký mở link, xem tài liệu, điền/ ký các trường → backend lưu giá trị, cập nhật trạng thái.

Task này **chưa** xử lý “render/stamp chữ ký vào PDF cuối” (có thể là task kế tiếp), nhưng thiết kế data đã chuẩn để làm được.

---

## 2. Thay đổi database (Prisma)

**File**: `backend/prisma/schema.prisma`

### 2.1 Bảng `sign_request_fields`

```prisma
model sign_request_fields {
  id                Int       @id @default(autoincrement())
  sign_request_id   Int
  document_id       Int
  assigned_signer_id Int?     // signer.id, null = field chung hoặc sẽ gán sau

  type              String    // 'signature' | 'text' | 'date' | 'checkbox'
  page              Int
  x                 Float
  y                 Float
  width             Float?
  height            Float?

  required          Boolean   @default(true)
  label             String?
  placeholder       String?
  read_only         Boolean   @default(false)

  created_at        DateTime  @default(now())

  sign_request      sign_requests @relation(fields: [sign_request_id], references: [id], onDelete: Cascade)
  document          documents      @relation(fields: [document_id], references: [id], onDelete: Cascade)
  assigned_signer   signers?       @relation(fields: [assigned_signer_id], references: [id], onDelete: SetNull)
  values            sign_request_field_values[]

  @@index([sign_request_id])
  @@index([document_id])
}
```

### 2.2 Bảng `sign_request_field_values`

```prisma
model sign_request_field_values {
  id           Int       @id @default(autoincrement())
  field_id     Int
  signer_id    Int
  value        Json
  filled_at    DateTime  @default(now())

  field        sign_request_fields @relation(fields: [field_id], references: [id], onDelete: Cascade)
  signer       signers            @relation(fields: [signer_id], references: [id], onDelete: Cascade)

  @@index([field_id])
  @@index([signer_id])
}
```

**Tasks DB**:

- [ ] Thêm 2 model trên vào `schema.prisma`.
- [ ] Chạy `npx prisma generate` + `npx prisma db push` (hoặc migration phù hợp).

---

## 3. Backend – Sender Editor APIs

### 3.1 Mục tiêu

Cho phép frontend (màn hình editor) lấy & lưu:

- Danh sách signer, documents, fields của 1 `sign_request` đang draft.  
- Tạo/cập nhật/xoá fields trước khi gửi yêu cầu ký.

### 3.2 Module & file

**Module**: `backend/src/modules/signRequests` (hoặc sub‑module `signRequestFields`).  

**Files gợi ý**:

- `signRequestFields.repository.ts`
- `signRequestFields.service.ts`
- Tích hợp endpoints vào `signRequests.controller.ts` + `signRequests.routes.ts`.

### 3.3 API đề xuất (internal – dùng Auth + RBAC)

Tất cả routes dưới đây đều đi qua `authGuard` và (nếu có) `requirePermission('sign_requests','update')` hoặc tương đương.

1. `GET /api/v1/sign-requests/:id/editor`
   - Trả về dữ liệu cho màn editor, ví dụ:
     ```json
     {
       "success": true,
       "data": {
         "sign_request": { ... },
         "document": { ... },
         "signers": [ ... ],
         "fields": [ ... ]
       }
     }
     ```
   - Kiểm tra:
     - Tenant (sign_request.tenant_id == req.auth.tenantId).  
     - Người gọi là owner hoặc có quyền manage sign_request (RBAC).

2. `POST /api/v1/sign-requests/:id/fields`
   - Body: mảng fields mới/đã chỉnh:
     ```json
     [
       {
         "id": 123?,
         "document_id": 10,
         "assigned_signer_id": 45,
         "type": "signature",
         "page": 1,
         "x": 100,
         "y": 200,
         "width": 150,
         "height": 40,
         "required": true,
         "label": "Ký ở đây",
         "placeholder": ""
       }
     ]
     ```
   - Service:
     - Chỉ chấp nhận thao tác khi `sign_request.status` thuộc nhóm `['draft', 'design']`.  
     - Upsert theo `id`: nếu có `id` → update; nếu không → create.  
     - Xoá các field đang không còn trong danh sách (option – hoặc tạo endpoint delete riêng).

3. (Optional) `DELETE /api/v1/sign-requests/:id/fields/:fieldId`
   - Xoá field đơn lẻ.

4. Cập nhật `POST /api/v1/sign-requests/:id/send`
   - Trước khi gửi (set status `sent`):
     - Validate:
       - Có ít nhất 1 signer.
       - Mọi field `required` đã có `assigned_signer_id` hợp lệ.  
     - Sau khi pass → logic gửi OTP/email như hiện tại.

---

## 4. Backend – APIs cho người ký (public signing)

### 4.1 Mục tiêu

Cho phép signer truy cập link ký (không cần login app nội bộ), xem tài liệu, lấy danh sách fields của mình và submit giá trị.

### 4.2 Token hoá cho signer

**Ý tưởng**:

- Mỗi `signer` có một `signing_token` riêng:
  - Sinh khi sign_request được gửi (`send`).  
  - JWT hoặc random string, map tới signer.id.  
  - Dùng trong URL: `/sign/:token` (hoặc `/sign/:envelopeCode/:token`).  

**Schema (gợi ý)** – có thể thêm sau, không bắt buộc trong task này:

- Thêm field `signing_token String?` trong `signers`.  

### 4.3 API public

Namespace gợi ý: `/public/sign` (không sử dụng JWT của app, chỉ dùng signing_token).

1. `GET /public/sign/:token`
   - Mục đích: load màn hình ký.
   - Trả về:
     - Thông tin sign_request (title, message).  
     - Thông tin document (để embed viewer).  
     - Thông tin signer (tên, email, role).  
     - Danh sách fields được assign cho signer + trạng thái (đã điền hay chưa).  
   - Validate:
     - Token hợp lệ, signer chưa completed/declined.  
     - sign_request.status cho phép ký.

2. `GET /public/sign/:token/document`
   - Stream PDF để viewer hiển thị.  
   - Đọc `file_path` nội bộ nhưng không lộ path ra ngoài (sử dụng logic download an toàn đã có trong task hardening).

3. `POST /public/sign/:token/send-otp`
   - Reuse `sendOtp` logic của `signers.service`.  

4. `POST /public/sign/:token/sign`
   - Body:
     ```json
     {
       "otp": "123456",
       "field_values": [
         { "field_id": 1, "value": "Nguyễn Văn A" },
         { "field_id": 2, "value": true },
         { "field_id": 3, "value": "data:image/png;base64,..." }
       ]
     }
     ```
   - Service:
     - Tìm signer theo token, verify OTP (nếu yêu cầu).  
     - Kiểm tra signer đang ở trạng thái cho phép (pending/otp_sent).  
     - Lưu `sign_request_field_values` (upsert per field+signer).  
     - Cập nhật `signers.status = 'completed'`, `signed_at`.  
     - Gọi lại logic `updateSignRequestStatus` hiện có để cập nhật status envelope và document.  

> Task này chưa yêu cầu render chữ ký vào PDF vật lý – chỉ lưu dữ liệu field. Việc stamp vào PDF sẽ là task tiếp theo (PDF rendering).

---

## 5. Frontend – Sender Editor UI

**Route gợi ý**: `/sign-requests/:id/editor` (nằm trong `(dashboard)`).

### 5.1 Data fetching

- Dùng `useAuth().fetchJson`:
  - `GET /api/v1/sign-requests/:id/editor` để lấy:
    - `sign_request`, `document`, `signers`, `fields`.
  - Viewer PDF có thể dùng endpoint download hiện tại (sau khi hardening), hoặc trực tiếp `file_path` internal nếu chỉ chạy dev.

### 5.2 Layout

Theo mock bạn đã gửi:

- Sidebar trái:
  - Danh sách người ký (signers) với avatar, tên, vai trò (Ký chính/Ký nháy...).  
  - Cho phép chọn 1 signer “đang active” (highlight).
- Panel “Trường dữ liệu”:
  - Các nút/tiles: “Chữ ký”, “Họ Tên”, “Ngày ký”, “Checkbox”.  
  - Khi click hoặc drag:
    - Tạo field mới gán cho signer đang active, type tương ứng.
- Trung tâm:
  - PDF viewer (có thể dùng iframe/pdf.js hoặc component custom).  
  - Cho phép drag các field (overlay) trên bề mặt PDF, cập nhật `page/x/y/width/height`.
- Sidebar phải:
  - Cài đặt email (title, message).  
  - Tuỳ chọn nâng cao (deadline, nhắc nhở,...) – có thể reuse logic hiện tại.

### 5.3 State & Mutations

- State cục bộ cho fields (array) + signer được chọn.  
- `useMutation` để:
  - `POST /sign-requests/:id/fields` khi:
    - Thêm mới field.  
    - Di chuyển field.  
    - Xoá field.  

- Button “Lưu nháp”:
  - Chỉ save fields (giữ `status = 'draft'`).  
- Button “Gửi yêu cầu ký”:
  - Gọi `POST /sign-requests/:id/send`.  
  - Handle error khi thiếu fields required/assign signer.

---

## 6. Frontend – UI người ký

**Route gợi ý**: `/sign/:token` (public, không nằm trong `(dashboard)`).

### 6.1 Data fetching

- Dùng native `fetch` (vì không có AuthProvider ở mức public), gọi:
  - `GET /public/sign/:token` để lấy metadata và fields.  
  - `GET /public/sign/:token/document` cho viewer (hoặc `<object src>`).

### 6.2 Layout

- Header: thông tin sign_request (Tiêu đề, người gửi).  
- Left sidebar: list các field signer cần hoàn thành (checklist).  
- Center: PDF viewer, highlight field active.  
- Right optional: thông tin chi tiết (message, deadline, số bước...).  

### 6.3 Interaction

- Khi click 1 field trong list → scroll/zoom tới field trên PDF.  
- Khi click field trên PDF:
  - Mở “editor nhỏ”:
    - `type = text/date` → input text hoặc date picker.  
    - `type = checkbox` → toggle.  
    - `type = signature` → component chữ ký:
      - Cho phép vẽ (canvas) + nút “Clear”.  
      - Optionally upload image (task sau).  

- Button “Xác nhận & gửi / Hoàn thành ký”:
  - Gửi `POST /public/sign/:token/sign` với `field_values` + `otp` nếu có.  
  - Hiển thị trạng thái thành công: “Bạn đã ký xong tài liệu này”.  

---

## 7. Acceptance Criteria

### 7.1 Backend

- [ ] `sign_request_fields` và `sign_request_field_values` tồn tại, Prisma generate OK.  
- [ ] `GET /api/v1/sign-requests/:id/editor` trả về đúng structure, không lộ dữ liệu cross‑tenant.  
- [ ] `POST /api/v1/sign-requests/:id/fields` có thể tạo/cập nhật/xoá fields cho 1 envelope draft.  
- [ ] `POST /public/sign/:token/sign` lưu chính xác `field_values` cho signer, cập nhật status signer + sign_request như hiện tại (hoặc theo logic mới).  
- [ ] Khi signer đã `completed`, call lại `GET /public/sign/:token` báo trạng thái đã ký, không cho sửa tiếp.

### 7.2 Frontend

- [ ] `/sign-requests/:id/editor` hiển thị: danh sách signer, viewer PDF, palette fields.  
- [ ] Có thể thêm ít nhất 4 loại field (signature, text, date, checkbox) và gán cho signer.  
- [ ] Sau “Gửi yêu cầu ký”, người ký nhận được link (task email đã có) và khi mở `/sign/:token` thấy đúng fields của mình.  
- [ ] Người ký điền/ ký xong, backend lưu dữ liệu, và sender thấy trạng thái signer chuyển sang `completed`.

---

## 8. Ghi chú cho reviewer (GPT)

- Kiểm tra schema Prisma mới không phá những model sẵn (documents, sign_requests, signers).  
- Xem cách Kiro nối editor vào flow hiện tại: tránh duplicate logic signRequests/create.  
- Với public routes, xác nhận token signer được sinh & validate đúng, không lẫn với JWT auth của app chính.  
- Đây là nền tảng để task tiếp theo render/stamp chữ ký vào PDF, nên chỉ cần đảm bảo data model đủ linh hoạt (page/x/y/type/value) và không khoá kiến trúc.  
