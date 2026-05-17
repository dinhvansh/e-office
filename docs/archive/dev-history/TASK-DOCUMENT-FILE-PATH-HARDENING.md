# TASK: Bảo mật `file_path` & endpoint download tài liệu

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: TODO  
**Phase**: 1 (Security hardening nhẹ, chuẩn bị cho Phase 2)

---

## 1. Mục tiêu

Giảm rủi ro bảo mật liên quan tới **đường dẫn file trên server**:

- Không để lộ đường dẫn lưu trữ nội bộ (`./storage/...`) cho client.
- Tránh khả năng **đọc file tùy ý** qua tham số `storage_path` trong API upload.
- Thiết kế một **endpoint download an toàn** dựa trên `documentId` + check quyền, chuẩn bị cho Phase 2 (workflow & document permissions).

Task này **không** thay đổi logic e‑signature hay workflow, chỉ hardening lớp storage/documents.

---

## 2. Hiện trạng

### 2.1 Lưu & expose `file_path`

- Backend:
  - `documents` có trường `file_path` lưu đường dẫn thật trên disk: `STORAGE_BASE_PATH/{tenantId}/{timestamp}_{safeName}`.
  - API `GET /documents` trả về full `file_path` trong JSON.
- Frontend:
  - `/documents` page dùng `doc.file_path.split("/").pop()` để hiển thị tên file → người dùng nhìn thấy pattern lưu trữ nội bộ.

Rủi ro:

- Lộ cấu trúc, pattern và một phần đường dẫn nội bộ → không nghiêm trọng ngay, nhưng không “sạch” về security/hardening.
- Về lâu dài, nếu có bug khác (vd. endpoint file browser) thì attacker có thể lợi dụng kiến thức về path.

### 2.2 Upload với `storage_path`

- API `POST /documents` cho phép:
  - Gửi `file_base64` (main path, đang dùng trong UI).
  - Hoặc gửi `storage_path` → backend `fs.readFile(storage_path)` để hash.
- Nếu endpoint này bị lộ cho client không tin cậy và không có restriction, đây là **vector Local File Read (LFR)**:
  - Client có thể đoán path, gửi `/etc/passwd`, v.v. (tuỳ OS), và backend sẽ đọc file đó.

---

## 3. Scope của task

Trong task này Kiro sẽ:

1. **Ẩn `file_path` khỏi API public** (không gửi raw path ra frontend).  
2. **Hiển thị tên file bằng metadata riêng** (ví dụ `original_file_name` hoặc dùng `title`).  
3. **Thiết kế & implement endpoint download an toàn**:
   - `GET /documents/:id/download` (hoặc tương đương).
   - Check quyền trước khi đọc file.  
4. **Khoá/giới hạn `storage_path`**:
   - Tối thiểu, reject mọi path ngoài `STORAGE_BASE_PATH`.  
   - Optionally, vô hiệu hoá luôn đường này cho client bên ngoài (chỉ dùng nội bộ/CLI nếu cần).

---

## 4. Yêu cầu Backend

### 4.1 Không expose `file_path` ra API công khai

**Mục tiêu**: client **không cần biết** file nằm ở đâu trên disk, chỉ cần `id`/metadata + endpoint download.

**Gợi ý triển khai**:

- Tầng `documentsRepository` **vẫn** trả full `documents` (gồm `file_path`) – không cần đổi.  
- Tầng controller/response:
  - Khi trả JSON cho `GET /documents` và `GET /documents/:id`, loại bỏ `file_path` khỏi payload trả về, hoặc map sang trường ít nhạy cảm hơn → ví dụ:
    - Trả về `original_file_name` (field mới) hoặc `title` để hiển thị trên UI.
    - Không trả `file_path` thô.
- Có thể implement mapping trong service hoặc controller, ví dụ:
  - Dùng DTO riêng cho response: `{ id, title, document_number, status, created_at, ... }` (không bao gồm `file_path`).  

> Quan trọng: logic nội bộ (hash, download) vẫn dùng `file_path`. Chỉ **response ra ngoài** là gọn và an toàn hơn.

### 4.2 Field tên file “hiển thị”

Để frontend không còn phải `split("/")` từ `file_path`, cần một field rõ ràng:

- Option 1 (nhỏ, tận dụng field hiện có):
  - Dùng `title` để hiển thị tên tài liệu, ở frontend đổi UI từ “Tên file” sang “Tiêu đề tài liệu” (đã có pattern này).  
  - Khi upload, nếu user không nhập `title`, backend có thể default `title = fileName` ban đầu (chỉ để hiển thị).
- Option 2 (rõ ràng hơn, dài hạn):
  - Thêm field `original_file_name String?` vào model `documents`.  
  - Khi upload:
    - Lưu `original_file_name = file_name` (tên file người dùng thấy).  
    - `file_path` dùng cho internal storage.
  - API list/detail trả `original_file_name` thay vì `file_path`.

Trong scope task này, chỉ cần **chọn 1 option** và áp dụng nhất quán backend + frontend.

### 4.3 Endpoint download an toàn

**Đề xuất route**: `GET /api/v1/documents/:id/download`

**Yêu cầu**:

- Bắt buộc qua `authGuard`.  
- Bắt buộc check quyền xem document (tối thiểu reuse `canViewDocument(user, doc)`):
  - Nếu `canViewDocument` false → 403 (`DOCUMENT_ACCESS_DENIED`).
- Nếu OK:
  - Đọc `file_path` từ DB bằng `documentsRepository.findById`.  
  - Kiểm tra `file_path` nằm trong `STORAGE_BASE_PATH/{tenantId}` (double‑check an toàn).  
  - Stream file về client (set `Content-Type` từ MIME hoặc `application/pdf`, `Content-Disposition` có `filename=...`).  

Lưu ý:

- Không cho phép client gửi path hay điều khiển trực tiếp filesystem.  
- Mọi truy cập file đều đi qua một hàm download chung có guard.

### 4.4 Khoá/giới hạn `storage_path`

**Đường hiện tại**: trong `createDocument`, nếu `storagePath` được gửi → backend dùng path đó để đọc file.

**Yêu cầu tối thiểu**:

- Trước khi chấp nhận `storagePath`, phải kiểm tra:
  - Path **không chứa** `..` hoặc pattern path traversal.  
  - Path bắt buộc phải nằm trong `env.STORAGE_BASE_PATH` (hoặc dưới thư mục tenant tương ứng).  
  - Nếu không thoả, ném `ApiError.badRequest("Invalid storage path", "INVALID_STORAGE_PATH")`.

**Option mạnh hơn (khuyến nghị)**:

- Định nghĩa rõ: `storage_path` **chỉ được dùng nội bộ** (vd. job ingest file trên server), không cho client browser dùng.  
- Có thể:
  - Thêm flag `ALLOW_STORAGE_PATH_UPLOAD` trong `.env` (default = false) và **reject** nhánh `storagePath` ở môi trường bình thường.  
  - Giữ code để phục vụ script nội bộ (nếu cần) nhưng không expose trong UI / docs.

---

## 5. Yêu cầu Frontend

### 5.1 Không dùng `file_path` để hiển thị

**File**: `frontend/app/(dashboard)/documents/page.tsx`

- Hiện UI hiển thị tên file bằng:  
  ```ts
  doc.file_path.split("/").pop()
  ```

**Cần đổi**:

- Sử dụng field mới/khác từ backend:
  - `doc.title` hoặc `doc.original_file_name` (tuỳ Option backend).  
  - Nếu vì lý do nào đó vẫn cần fallback, có thể là:
    - `doc.title || doc.original_file_name || "Tài liệu #id"` – nhưng tuyệt đối không split path nữa.

### 5.2 Download tài liệu qua endpoint mới

Sau khi backend có `/documents/:id/download`:

- Thêm nút download (nếu chưa có) cho mỗi dòng trong bảng documents:
  - Gọi `window.open("/api/v1/documents/" + doc.id + "/download")` hoặc dùng `<a href="...">`.  
  - Đảm bảo request mang theo JWT (nếu dùng `fetch`, cần gắn `Authorization`; nếu dùng link trực tiếp, có thể cân nhắc cookie hoặc token query, nhưng đây là chuyện dài hơn – task này có thể chưa bắt buộc).

Nếu hiện tại chưa muốn động vào download ở frontend, có thể **chưa thêm UI download**, nhưng nên chuẩn bị sẵn API để Phase sau dùng.

---

## 6. Acceptance Criteria

### 6.1 Backend

- [ ] API `GET /documents` và `GET /documents/:id` **không** trả `file_path` raw ra JSON (hoặc chỉ trả trong môi trường internal debug, không cho frontend dùng).  
- [ ] Field hiển thị tên file trong response (`title` hoặc `original_file_name`) hợp lý với hành vi upload hiện tại.  
- [ ] Endpoint `GET /documents/:id/download` (nếu implement trong task này):
  - [ ] Chỉ truy cập được khi có JWT hợp lệ.  
  - [ ] Nếu `canViewDocument(user, doc)` false → 403.  
  - [ ] Nếu true → trả file PDF tương ứng từ `file_path`.  
- [ ] Upload qua `storage_path`:
  - [ ] Reject mọi path không nằm trong `STORAGE_BASE_PATH` hoặc chứa dấu hiệu traversal.  
  - [ ] Trong môi trường bình thường, UI **không dùng** `storage_path`, chỉ dùng base64.

### 6.2 Frontend

- [ ] `/documents` page không còn dùng `file_path.split("/")` để hiển thị tên tài liệu.  
- [ ] Tên hiển thị khớp với dữ liệu người dùng nhập lúc upload (title/file name).  
- [ ] Nếu có nút download: khi click, user không có quyền xem document → nhận lỗi phù hợp (không download được).

---

## 7. Test Tasks (gợi ý cho Kiro / QA)

**Backend** (dùng `test-api.http` hoặc REST client):

- [ ] Call `GET /documents` → xác nhận JSON **không** chứa nội dung path đầy đủ, chỉ có metadata cần thiết.  
- [ ] Upload tài liệu, query DB `SELECT file_path, original_file_name/title FROM documents` để đảm bảo:
  - `file_path` vẫn đúng (được dùng nội bộ).  
  - Field hiển thị trùng với tên người dùng mong đợi.  
- [ ] Tạo document với `confidential_level = 'secret'` và test endpoint download với user không có quyền → 403.  
- [ ] Thử gọi upload với `storage_path` là path “đọc thử” ngoài `STORAGE_BASE_PATH` → 400 `INVALID_STORAGE_PATH`.

**Frontend** (manual):

- [ ] Mở `/documents`, kiểm tra cột “Tên tài liệu” hiển thị theo metadata, không còn format giống path.  
- [ ] Nếu có nút download, thử với user không có quyền (document bí mật/private) → UI xử lý lỗi (toast/message), không tải được file.

---

## 8. Ghi chú cho reviewer (GPT)

- Kiểm tra kỹ JSON trả về từ documents API: không expose `file_path`.  
- Kiểm tra logic bảo vệ download (nếu đã implement): sử dụng chung `canViewDocument`.  
- Đảm bảo không phá backward compatibility với các script test (`test-api.http`) – nếu API shape đổi, cập nhật test tương ứng.

