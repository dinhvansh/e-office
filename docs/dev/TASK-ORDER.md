# Thứ tự triển khai các TASK chính (Phase 1–2)

**Mục đích**: file này chỉ là “mốc điều hướng” để Kiro/DEV1 và AI khác biết thứ tự ưu tiên task, KHÔNG thay thế nội dung chi tiết trong từng TASK-*.md.

---

## 1. Security & Documents (làm trước)

1. `TASK-DOCUMENT-VISIBILITY-MINIMAL.md`  
   - Visibility & confidential level cơ bản cho tài liệu.
2. `TASK-DOCUMENT-FILE-PATH-HARDENING.md`  
   - Ẩn `file_path`, endpoint download an toàn, khoá/giới hạn `storage_path`.
3. `TASK-DOCUMENT-RBAC-ENFORCEMENT.md`  
   - Gắn `requirePermission` cho documents + áp dụng `canViewDocument` cho các hành động quan trọng.

---

## 2. Tổ chức & metadata (Org chart, Positions)

4. `TASK-ORG-CHART-ENHANCEMENT.md`  
   - Nâng trang `/departments` thành sơ đồ tổ chức (tree + bảng chi tiết).  
5. `FEATURE-POSITIONS-PLAN.md`  
   - Hệ thống chức danh (positions) + gán vào user, chuẩn bị dùng trong workflow.

---

## 3. Document Type & Workflow template

6. `TASK-DOCUMENT-TYPE-WORKFLOW-TEMPLATE.md`  
   - Mỗi loại văn bản có workflow nội bộ mặc định + rule cho phép/không cho phép override.
7. `FEATURE-FLEXIBLE-WORKFLOW-FINAL.md`  
   - Thiết kế/implement hệ thống workflow linh hoạt (fixed vs flexible) dựa trên schema `workflows` hiện tại.

---

## 4. E‑Sign nâng cao (Editor trường & UI người ký)

8. `TASK-SIGN-FIELDS-EDITOR.md`  
   - Editor trường dữ liệu cho sender + UI `/sign/:token` cho người ký điền/ký.

---

> Ghi chú: Sau khi hoàn thành mỗi task, nên cập nhật file này (hoặc đánh dấu trong TASK-* tương ứng) để dễ theo dõi tiến độ.*** End Patch```}}
