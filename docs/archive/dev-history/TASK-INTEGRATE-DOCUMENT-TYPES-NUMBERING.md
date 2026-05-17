# TASK: Tích hợp `document_types` + `numbering` vào flow upload tài liệu

**Owner dev chính**: Kiro  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: TODO

---

## 1. Mục tiêu

Khi **upload tài liệu mới** qua API `/api/v1/documents` và UI `/documents`:

- Người dùng chọn **Loại văn bản (Document Type)** cho tài liệu.
- Nếu loại văn bản đó **yêu cầu đánh số** (`require_numbering = true`) và đã có rule tương ứng trong `numbering_rules`:
  - Hệ thống **tự sinh Số văn bản** (`documents.document_number`) theo pattern rule (vd. `{AUTO}/{YEAR}/{TYPE}` → `001/2025/QD`).
  - Lưu thêm `documents.numbering_rule_id` để biết số này sinh từ rule nào.
- Nếu loại văn bản **không yêu cầu đánh số** (`require_numbering = false`):
  - Tài liệu vẫn được upload bình thường, chỉ gắn `document_type_id`, không có `document_number`.
- Giữ **backward compatibility**:
  - Các script/test cũ vẫn có thể gọi `/documents` mà **không gửi** `document_type_id` → behavior cũ, document generic, không số.

---

## 2. Kiến trúc & bối cảnh

### 2.1 Backend hiện tại

- Module `documents`:
  - `documents.controller.ts`: nhận body `{ file_name, file_base64 | storage_path }`, gọi `documentsService.createDocument`.
  - `documents.service.ts`: 
    - Check payload.
    - Gọi `licenseService.enforceDocumentLimit(tenantId)`.
    - Lưu file qua `saveBase64Document` (fileStorage).
    - Tạo record trong bảng `documents` với các field cơ bản (`tenant_id`, `owner_id`, `file_path`, `hash`, `status = draft`).
    - Ghi `audit_logs` event `document.uploaded`.
- Module `documentTypes`:
  - Đã có CRUD API `/api/v1/document-types` với đầy đủ fields (`code`, `name`, `require_numbering`, `require_digital_signing`, `category`, `is_active`).
- Module `numbering`:
  - Đã có service `numberingService.generateDocumentNumber(...)` và API `/api/v1/numbering-rules` (CRUD + preview/generate).
  - Pattern hỗ trợ `{AUTO}`, `{YEAR}`, `{MONTH}`, `{DEPT}`, `{TYPE}`.
- Prisma `documents` đã có các cột E‑Office:
  - `document_type_id`, `document_number`, `numbering_rule_id`, `title`, `summary`, `priority_level`, `confidential_level`, ...

### 2.2 Frontend hiện tại

- Trang `/documents` (`frontend/app/(dashboard)/documents/page.tsx`):
  - Cho phép chọn file PDF, đặt `fileName`, upload qua `POST /documents` (body `{ file_name, file_base64 }`).
  - List danh sách documents với các cột: ID, tên file, status, created_at.
  - Sử dụng `useAuth().fetchJson` + React Query.
- Trang `/document-types` (`frontend/app/(dashboard)/document-types/page.tsx`):
  - Hiển thị danh sách loại văn bản, rule đánh số.
  - Đang tự fetch API với `localStorage.getItem('token')` (lưu ý để reuse types).

---

## 3. Yêu cầu chi tiết – Backend

### 3.1 Mở rộng API `/documents` để nhận `document_type_id`

**File**: `backend/src/modules/documents/documents.controller.ts`

**Việc cần làm**:

1. **Mở rộng schema input (Zod)**:
   - Thêm field optional `document_type_id`:
     - Kiểu: `z.number().int().positive().optional()` (hoặc `z.coerce.number()` nếu parse từ string).
   - (OPTIONAL giai đoạn này) có thể thêm các field metadata khác nếu muốn dùng luôn:
     - `title?: string`
     - `summary?: string`
     - `priority_level?: string`
     - `confidential_level?: string`

2. **Map sang service**:
   - Trong `create`, sau `const body = createSchema.parse(req.body);`:
     - Truyền thêm `documentTypeId: body.document_type_id` (và các metadata khác nếu có) vào `documentsService.createDocument(...)`.

3. **Giữ backward compatibility**:
   - Không bắt buộc `document_type_id` trong schema → các call cũ vẫn chạy bình thường.

### 3.2 Mở rộng `DocumentsService` để xử lý DocumentType & Numbering

**File**: `backend/src/modules/documents/documents.service.ts`

**Định nghĩa input mới**:

- Mở rộng `CreateDocumentInput`:
  ```ts
  export interface CreateDocumentInput {
    fileName: string;
    base64?: string;
    storagePath?: string;
    documentTypeId?: number;          // NEW
    // Optional metadata cho phase sau:
    title?: string;
    summary?: string;
    priorityLevel?: string;
    confidentialLevel?: string;
  }
  ```

**Logic mới trong `createDocument`** (giữ nguyên phần lưu file, hash, license):  

Pseudo-flow:

1. Sau khi có `filePath` + `hash`, trước khi build payload `CreateDocumentData`:

   - Nếu **không có** `input.documentTypeId`:
     - → giữ nguyên behavior cũ (document generic, không số, không type).

   - Nếu **có** `input.documentTypeId`:
     1. Load `document_type` tương ứng của tenant:
        - Có thể tạo helper riêng hoặc dùng Prisma trực tiếp:
          - `prisma.document_types.findFirst({ where: { id: input.documentTypeId, tenant_id: tenantId, is_active: true }, include: { numbering_rules: true } })`
        - Nếu **không tìm thấy** hoặc `is_active = false` → ném `ApiError.notFound("Document type not found", "DOCUMENT_TYPE_NOT_FOUND")`.

     2. Nếu `document_type.require_numbering = true`:
        - Dùng service từ module `numbering` để sinh số và lấy rule:
          - Tạo hàm mới trong `numberingService` (xem mục 3.3):
            - `generateNumberForDocument(tenantId, documentTypeId): Promise<{ documentNumber: string; ruleId: number }>`
        - Nếu `numberingService` báo không có rule active → ném `ApiError.badRequest("Numbering rule not configured", "NUMBERING_RULE_NOT_CONFIGURED")`.
        - Nếu OK:
          - Lưu:
            - `document_type_id = documentType.id`
            - `document_number = documentNumber`
            - `numbering_rule_id = ruleId`

     3. Nếu `document_type.require_numbering = false`:
        - Chỉ set: `document_type_id = documentType.id`.
        - Không set `document_number` và `numbering_rule_id`.

2. Build payload `CreateDocumentData` với các field mới (nếu có).

3. Gọi `documentsRepository.create(payload)` như cũ, audit log giữ nguyên.

### 3.3 Bổ sung hàm helper trong `numberingService`

**File**: `backend/src/modules/numbering/numbering.service.ts`

Hiện đã có `generateDocumentNumber(...)`. Để dùng trong `DocumentsService`, nên tạo 1 hàm wrapper:

- Hàm mới (gợi ý):

```ts
async function generateNumberForDocument(
  tenantId: number,
  documentTypeId: number
): Promise<{ documentNumber: string; ruleId: number }> {
  // 1. Lấy rule theo tenant + documentType
  // 2. Validate is_active
  // 3. Tăng last_number (incrementNumber)
  // 4. Build documentNumber bằng pattern + tokens
  // 5. Trả về { documentNumber, ruleId: rule.id }
}
```

**Yêu cầu**:

- Reuse càng nhiều càng tốt logic đã có trong `generateDocumentNumber`:
  - Token `{AUTO}`, `{YEAR}`, `{MONTH}`, `{TYPE}`.
  - `{DEPT}` giai đoạn này có thể set `''` hoặc placeholder (vì chưa có department code).
- Nếu **không tìm được rule** hoặc rule inactive:
  - Ném `Error` hoặc tốt hơn là `ApiError` (tùy layer sử dụng).
  - Trong `DocumentsService`, convert thành `ApiError` với code `"NUMBERING_RULE_NOT_CONFIGURED"`.

### 3.4 Mở rộng `CreateDocumentData` và repository

**File**: `backend/src/modules/documents/documents.repository.ts`

- Interface hiện tại:
  ```ts
  export interface CreateDocumentData {
    tenant_id: number;
    owner_id: number;
    file_path: string;
    hash?: string | null;
    status?: string | null;
    version?: number;
  }
  ```

**Việc cần làm**:

- Mở rộng interface để chứa các field metadata (optional):
  ```ts
  export interface CreateDocumentData {
    tenant_id: number;
    owner_id: number;
    file_path: string;
    hash?: string | null;
    status?: string | null;
    version?: number;
    document_type_id?: number | null;
    document_number?: string | null;
    numbering_rule_id?: number | null;
    title?: string | null;
    summary?: string | null;
    priority_level?: string | null;
    confidential_level?: string | null;
  }
  ```

- Bên trong `create(data)`: không cần đổi gì, Prisma nhận object với các field optional.

### 3.5 Lỗi & code lỗi (error codes)

- Nếu loại văn bản không tồn tại / không thuộc tenant / inactive:
  - `ApiError.notFound("Document type not found", "DOCUMENT_TYPE_NOT_FOUND")`.
- Nếu loại văn bản yêu cầu numbering nhưng chưa cấu hình rule:
  - `ApiError.badRequest("Numbering rule not configured for this document type", "NUMBERING_RULE_NOT_CONFIGURED")`.
- License limit quá số lượng document:
  - Giữ nguyên logic hiện tại (`LICENSE_DOC_LIMIT`).

---

## 4. Yêu cầu chi tiết – Frontend

### 4.1 Thêm dropdown chọn loại văn bản trong `/documents`

**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Việc cần làm**:

1. **Điều chỉnh types**:
   - Di chuyển interface `DocumentType` từ `document-types/page.tsx` vào `frontend/lib/types.ts` (hoặc tạo mới nếu chưa có).
   - Mở rộng `DocumentRecord`:
     - Thêm: `document_number?: string | null;`
     - Thêm: `document_type_id?: number | null;`

2. **Load danh sách DocumentTypes**:
   - Dùng `useAuth()` để lấy `fetchJson`.
   - Tạo `useQuery` mới:
     - `queryKey: ["document-types"]`.
     - `queryFn: () => fetchJson<{ data: DocumentType[] }>("/document-types")` (hoặc shape thực tế backend → cần đồng bộ).
   - Lọc chỉ `is_active = true` để render trong dropdown.

3. **UI dropdown**:
   - Thêm state `selectedDocumentTypeId: number | null` và optional `selectedDocumentType` nếu cần.
   - Trong form upload, thêm `<select>`:
     - Placeholder: `-- Chọn loại văn bản --`.
     - Options: `types.map(type => <option value={type.id}>{type.name} ({type.code})</option>)`.
   - Validation client: nếu chưa chọn → không gọi mutation, show message “Vui lòng chọn loại văn bản”.

4. **Gửi `document_type_id` khi upload**:
   - Trong `uploadMutation.mutationFn`, khi build body cho `fetchJson("/documents", { method:"POST", body: JSON.stringify(...) })`:
     - Thêm `document_type_id: selectedDocumentTypeId`.

### 4.2 Hiển thị Số văn bản trong danh sách

**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Việc cần làm**:

1. Sau khi mở rộng `DocumentRecord`, đảm bảo React Query parse được `document_number` từ API.
2. Thêm cột mới trong bảng:
   - "Số văn bản": hiển thị `doc.document_number` hoặc `—` nếu null.
3. Optional (tuỳ thời gian):
   - Thêm cột "Loại văn bản" (mapping `document_type_id` → `DocumentType.name` bằng list đã load).

---

## 5. Acceptance Criteria (Kiro tự test + e2e)

### 5.1 Backend

- [ ] Gọi `POST /api/v1/documents` **không** gửi `document_type_id`:
  - Document tạo thành công (behavior y như hiện tại).
  - Record trong DB: `document_type_id`, `document_number`, `numbering_rule_id` đều `NULL`.

- [ ] Gọi `POST /api/v1/documents` với `document_type_id` trỏ tới type `require_numbering = false`:
  - Document tạo thành công.
  - DB:
    - `document_type_id = <id>`.
    - `document_number = NULL`.
    - `numbering_rule_id = NULL`.

- [ ] Gọi `POST /api/v1/documents` với `document_type_id` trỏ tới type `require_numbering = true` **và có rule active**:
  - Document tạo thành công.
  - DB:
    - `document_type_id = <id>`.
    - `numbering_rule_id = <rule.id>`.
    - `document_number` không rỗng, khớp pattern rule (kiểm tra bằng mắt là đủ).
  - Bảng `numbering_rules`:
    - `last_number` tăng thêm 1.

- [ ] Gọi `POST /api/v1/documents` với `document_type_id` trỏ tới type `require_numbering = true` **nhưng không có rule active**:
  - API trả 400 với payload:
    - `success: false`
    - `error.code = "NUMBERING_RULE_NOT_CONFIGURED"` (hoặc đúng như đã implement).

- [ ] Trường hợp license hết hạn / đạt limit docs vẫn hoạt động như cũ (ưu tiên check license trước khi generate number).

### 5.2 Frontend

- [ ] Trang `/documents` hiển thị dropdown "Loại văn bản" (load từ `/document-types`):
  - Chỉ hiển thị các loại `is_active = true`.

- [ ] Nếu không chọn loại và bấm "Tải tài liệu":
  - Không gọi API, hiển thị cảnh báo trên UI.

- [ ] Khi chọn loại `require_numbering = false` và upload:
  - Document xuất hiện trong bảng.
  - Cột "Số văn bản" hiển thị `—` hoặc để trống (nhưng không crash).

- [ ] Khi chọn loại `require_numbering = true` (có rule) và upload:
  - Document xuất hiện trong bảng.
  - Cột "Số văn bản" hiển thị giá trị được backend generate.

- [ ] Playwright smoke test (nếu có sửa) vẫn pass hoặc được cập nhật tối thiểu để phản ánh thay đổi (ví dụ nếu form bắt buộc chọn loại văn bản).

---

## 6. Ghi chú triển khai & review

- Kiro có thể implement theo từng bước nhỏ (backend trước, frontend sau).  
- Sau khi hoàn thành:
  - Cập nhật ngắn gọn trong `docs/dev/AGENTS.md` (progress log) phần Phase 1.
  - Ghi lại các API sample call trong `test-api.http` nếu có thêm case mới.
- Khi Kiro push code, mình (GPT – Senior Architect) sẽ review theo file này:
  - Kiểm tra logic numbering, error handling.
  - Kiểm tra việc không phá vỡ flow hiện tại (Playwright + test-basic-flow).
  - Gợi ý refactor nhẹ nếu cần.

---

## 7. Test Tasks (gợi ý cho Kiro / QA)

**Backend tests (có thể làm dưới dạng manual + script):**

- [ ] Dùng `test-api.http` hoặc REST client khác viết 4 request mẫu tương ứng các case trong mục 5.1 (no type, type không numbering, type có numbering + rule, type có numbering nhưng thiếu rule).
- [ ] Chạy `backend/scripts/test-basic-flow.ts` để đảm bảo flow cũ (upload + sign request) vẫn chạy sau khi đổi code.
- [ ] Kiểm tra trực tiếp DB (Postgres) xem các trường `document_type_id`, `document_number`, `numbering_rule_id`, `last_number` đúng như mong đợi.

**Frontend tests (manual / Playwright):**

- [ ] Manual: trên UI `/documents`, thử upload với mỗi loại document type (có/không numbering) và xác nhận cột “Số văn bản” hiển thị đúng.
- [ ] Manual: thử không chọn loại văn bản và bấm upload → xác nhận UI chặn và hiển thị thông báo hợp lý.
- [ ] Cập nhật (hoặc thêm) 1 scenario nhỏ trong `frontend/tests/e2e.spec.ts` nếu cần, để check đơn giản rằng sau khi login, dropdown “Loại văn bản” xuất hiện và upload thành công với 1 loại bất kỳ.
