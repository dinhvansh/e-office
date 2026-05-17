# TASK: Document Type – Default Internal Workflow & Override Rules

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: TODO  
**Phase**: 1 → Chuẩn bị cho Phase 2 (Workflow Engine)

---

## 1. Mục tiêu

Gắn **mỗi Loại văn bản (document_type)** với một **luồng phê duyệt nội bộ mặc định (internal workflow)**, và cấu hình:

- Loại văn bản A dùng workflow nội bộ nào làm mặc định khi “trình duyệt nội bộ”.  
- Có cho phép người tạo **sửa luồng phê duyệt** này khi trình nội bộ hay không (override hay fixed).

Task này **không** triển khai full workflow engine, mà:
- Dùng schema `workflows`, `workflow_steps` đã có trong Prisma.  
- Thêm metadata cần thiết (default/override) + UI cấu hình trên trang `/document-types`.  
- Chuẩn bị cho task sau sẽ dùng workflow này khi tạo `workflow_instances` cho tài liệu.

---

## 2. Bối cảnh & hiện trạng

### 2.1 Prisma schema liên quan

`backend/prisma/schema.prisma` đã có:

- `document_types`:
  - Quan hệ: `workflows workflows[]` (một loại văn bản có thể có nhiều workflow).  
- `workflows`:
  ```prisma
  model workflows {
    id                Int       @id @default(autoincrement())
    tenant_id         Int
    name              String
    description       String?
    document_type_id  Int?
    is_active         Boolean   @default(true)
    created_by        Int?
    created_at        DateTime  @default(now())
    tenant            tenants   @relation(fields: [tenant_id], references: [id])
    document_type     document_types? @relation(fields: [document_type_id], references: [id])
    steps             workflow_steps[]
    instances         workflow_instances[]
    approvals         document_approvals[]
    @@unique([tenant_id, name])
  }
  ```
- `workflow_steps`, `workflow_instances`, `document_approvals` đã exist nhưng chưa được dùng nhiều trong UI.

### 2.2 Nhu cầu

- Khi upload / xử lý một tài liệu nội bộ:
  - Nếu loại văn bản có workflow mặc định → hệ thống **biết dùng workflow nào** cho “trình duyệt nội bộ”.  
  - Nếu `allow_override = false` → người tạo chỉ “xem” được luồng, không sửa.  
  - Nếu `allow_override = true` → người tạo có thể thêm bước, đổi người duyệt.

---

## 3. Thiết kế dữ liệu (Backend)

### 3.1 Mở rộng model `workflows`

**File**: `backend/prisma/schema.prisma`

Thêm các field sau vào model `workflows`:

```prisma
model workflows {
  id                Int       @id @default(autoincrement())
  tenant_id         Int
  name              String
  description       String?
  document_type_id  Int?
  is_active         Boolean   @default(true)

  // NEW
  kind              String    @default("internal") // 'internal' | 'esign' | ...
  is_default_for_type Boolean @default(false)
  allow_sender_override Boolean @default(true)

  created_by        Int?
  created_at        DateTime  @default(now())
  tenant            tenants   @relation(fields: [tenant_id], references: [id])
  document_type     document_types? @relation(fields: [document_type_id], references: [id])
  steps             workflow_steps[]
  instances         workflow_instances[]
  approvals         document_approvals[]

  @@unique([tenant_id, name])
}
```

Ý nghĩa:
- `kind`:
  - Phân biệt workflow nội bộ (approval) với workflow dùng cho e‑sign (nếu sau này cần).  
  - Task này **tập trung vào `kind = 'internal'`**.
- `is_default_for_type`:
  - Nếu `true` và `document_type_id` != null → đây là workflow mặc định cho loại văn bản đó.  
  - Một document_type **nên** chỉ có 0 hoặc 1 workflow default (enforce bằng logic, chưa cần unique index phức tạp).
- `allow_sender_override`:
  - `true`: người trình nội bộ được phép chỉnh sửa luồng khi gửi.  
  - `false`: luồng mặc định là cố định, UI chỉ view, không sửa.

> Không thêm `default_workflow_id` vào `document_types` để tránh dư quan hệ; dùng `is_default_for_type` phía `workflows` là đủ.

### 3.2 API / service cho workflows (config theo document type)

**Module giả sử**: `backend/src/modules/workflows` (nếu đã tồn tại), hoặc sẽ tạo sau.  
Trong scope task này, chỉ cần chuẩn bị API phục vụ UI cấu hình:

Gợi ý endpoints (v1):

- `GET /workflows` với query:
  - `?document_type_id=...` → trả về list workflow của tenant cho loại này (hoặc workflows `kind = 'internal'` + `document_type_id = null` để chọn dùng chung).
- `POST /workflows`:
  - Tạo workflow mới (thiết kế steps sau, ở task khác).
- `PATCH /workflows/:id/config`:
  - Cho phép update `is_default_for_type`, `allow_sender_override`, `document_type_id`, `kind` (trong phạm vi hợp lý).

> Mục tiêu: để trang `/document-types` gọi được list workflows, chọn cái nào là default, bật/tắt override.

---

## 4. Yêu cầu Frontend – UI cấu hình tại `/document-types`

**File**: `frontend/app/(dashboard)/document-types/page.tsx`

Thêm một card/section “Luồng phê duyệt mặc định” cho mỗi loại văn bản:

### 4.1 Hiển thị thông tin

Trong card của mỗi `DocumentType`:
- Hiển thị:
  - Tên workflow nội bộ mặc định (nếu có), ví dụ: “Luồng duyệt: Nội bộ 3 bước (default)”.  
  - Badge cho biết `allow_sender_override` = true/false (vd. “Cho phép sửa” / “Cố định”).  

### 4.2 Cấu hình

- Nút “Cấu hình luồng phê duyệt” trên mỗi card có thể mở modal:
  - Trong modal:
    - Dropdown `select` list workflow nội bộ (`kind = 'internal'`) cho tenant:
      - Options:
        - “Không dùng workflow mặc định” (None).  
        - Từng workflow: `name` + (document_type scope).  
    - Checkbox / toggle:
      - `"Cho phép người tạo sửa luồng phê duyệt khi trình nội bộ"` → map tới `allow_sender_override`.
  - Khi Save:
    - Gọi API `PATCH /workflows/:id/config` hoặc API mới tương ứng:
      - Set `document_type_id = currentType.id`.  
      - Set `is_default_for_type = true`.  
      - Set `allow_sender_override` theo UI.  
    - Với các workflow khác cùng `document_type_id`, set `is_default_for_type = false` (logic này làm ở backend).

**Data flow gợi ý**:

- `useQuery(['workflows', type.id])`:
  - fetch `GET /workflows?document_type_id={id}` → list workflows nội bộ cho loại này.  
- `useMutation` cho update:
  - `PATCH /workflows/:id/config` với body:
    - `{ document_type_id, is_default_for_type, allow_sender_override }`.

> Task này không yêu cầu UI tạo/chỉnh steps workflow; chỉ chọn workflow đã có và toggle override.

---

## 5. Chuẩn bị cho Phase 2 – Use case khi trình duyệt nội bộ

Trong Phase 2, khi implement “trình duyệt nội bộ” cho documents, logic sẽ là:

1. Khi user bấm “Trình duyệt nội bộ” trên 1 document:
   - Backend tra `document.document_type_id`.  
   - Tìm workflow:
     - `workflows` với `tenant_id = doc.tenant_id`, `document_type_id = doc.document_type_id`, `is_default_for_type = true`, `kind = 'internal'`.  
2. Nếu tìm được:
   - Tạo `workflow_instances` cho document đó, dùng workflow này.  
   - Nếu `allow_sender_override = false`:  
     - UI hiển thị luồng nhưng không cho chỉnh steps.  
   - Nếu `true`:  
     - Cho phép user nội bộ chỉnh step/approver trước khi start instance (sẽ được thiết kế trong task Phase 2).

Task hiện tại **chỉ dừng ở config**, không cần implement bước 1–2, nhưng cần thiết kế sao cho:
- Sau này dễ tìm “default workflow” theo document type.  
- Cấu hình override rõ ràng.

---

## 6. Acceptance Criteria

### 6.1 Backend

- [ ] Prisma schema `workflows` có thêm các field:
  - `kind`, `is_default_for_type`, `allow_sender_override`.  
- [ ] API list workflows cho phép filter theo:
  - `document_type_id`, `kind = 'internal'`.  
- [ ] API cập nhật config workflow:
  - Có thể set một workflow thành default cho 1 document_type.  
  - Đảm bảo trong cùng tenant + document_type, chỉ có 0 hoặc 1 workflow có `is_default_for_type = true` (logic xử lý ở service).  
  - `allow_sender_override` được lưu đúng và trả về API.

### 6.2 Frontend

- [ ] Trang `/document-types` hiển thị được thông tin “luồng phê duyệt mặc định” (nếu có) cho mỗi loại.  
- [ ] Có thể mở modal/section để:
  - Chọn workflow nội bộ mặc định cho loại văn bản.  
  - Bật/tắt “Cho phép sửa luồng phê duyệt khi trình nội bộ”.  
- [ ] Sau khi save, reload lại page vẫn hiển thị đúng lựa chọn.

---

## 7. Test Tasks (gợi ý cho Kiro / QA)

**Backend**:
- Seed 2–3 workflows nội bộ:
  - Workflow A (document_type_id = null).  
  - Workflow B, C (document_type_id = X).  
- Dùng API:
  - Set Workflow B là default cho type X, `allow_sender_override = false`.  
  - Set Workflow C là default (thay B) cho type X → B phải bị clear `is_default_for_type = false`.  

**Frontend**:
- Vào `/document-types`:
  - Chọn 1 loại, cấu hình workflow default + toggle override.  
  - Refresh lại → thấy thông tin khớp.  
- Thay đổi lựa chọn workflow default 2–3 lần, đảm bảo UI & backend sync.

---

## 8. Ghi chú cho reviewer (GPT)

- Xác nhận schema Prisma được update đúng kiểu field + default.  
- Xác nhận API workflows filter & patch chạy theo đúng contract.  
- Xác nhận `/document-types` page không phá các chức năng cũ (list types, stats) và code vẫn dùng `useAuth().fetchJson` chuẩn.  
- Sau khi task này hoàn thành, có thể update `RBAC_IMPLEMENTATION_STATUS.md`/`ERD.md`/`FUNCTIONAL_SPEC.md` để phản ánh rằng document type đã có “workflow template” gắn kèm.

