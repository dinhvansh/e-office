# Phân Tích Dự Án & Các Điểm Không Hợp Lý

Sau khi phân tích cấu trúc thư mục, cơ sở dữ liệu và mã nguồn (backend/frontend), tôi đã xác định được một số điểm **không hợp lý** và tiềm ẩn rủi ro trong dự án này.

## 1. Cấu Trúc Dự Án & Quản Lý File (Rất Lộn Xộn)
Đây là vấn đề dễ thấy nhất và gây khó khăn cho việc bảo trì.

*   **Thư mục Root quá nhiều "rác"**: Có quá nhiều file `.md`, `.txt`, `.ps1`, `.bat` nằm ngay tại thư mục gốc.
    *   Ví dụ: `BAT-DAU-O-DAY.md`, `CAC-FILE-QUAN-TRONG.md`, `CONTEXT-FOR-NEXT-SESSION...md`.
    *   **Hậu quả**: Khó tìm kiếm file cấu hình quan trọng, gây rối mắt cho developer mới.
*   **Tài liệu chồng chéo**: Có quá nhiều file tài liệu với nội dung có thể trùng lặp hoặc mâu thuẫn (`README.md`, `QUICK-START.md`, `SETUP-FOR-DEV1.md`, `START-HERE-SETUP.md`...).
    *   **Khuyến nghị**: Nên gom tất cả tài liệu vào thư mục `docs/` và chỉ giữ lại 1 file `README.md` chuẩn làm mục lục.
*   **Scripts không chuẩn hóa**: Có nhiều script chạy dự án (`run.ps1`, `start.bat`, `chay-nhanh.ps1`...). Điều này cho thấy quy trình build/run chưa được chuẩn hóa.

## 2. Kiến Trúc & Logic Nghiệp Vụ (Vấn Đề Lớn Nhất)
Hệ thống đang tách rời hai quy trình lẽ ra phải là một: **Quy trình Phê duyệt (Workflow Approval)** và **Quy trình Ký (Sign Request)**.

*   **Sự tách biệt rời rạc**:
    *   `workflows` (và `workflow_instances`) quản lý việc **Phê duyệt** (Approve/Reject).
    *   `sign_requests` (và `signers`) quản lý việc **Ký** (Sign).
    *   **Vấn đề**: Một văn bản thực tế thường đi theo luồng: *Soạn thảo -> Trình ký -> Trưởng phòng Duyệt -> Giám đốc Ký*. Hiện tại, hệ thống đang xử lý "Duyệt" và "Ký" ở hai bảng khác nhau (`document_approvals` vs `signers`). Điều này làm cho việc theo dõi **trạng thái tổng thể** của văn bản rất khó khăn (Ví dụ: Văn bản đã duyệt xong ở `workflow` nhưng chưa ký ở `sign_request`?).
*   **Logic lặp lại & Hardcoded**:
    *   Logic xác định "Ai là người duyệt/ký" (User, Role, Department, Manager) bị lặp lại ở cả `workflows.service.ts` và `signRequests.service.ts`.
    *   Đặc biệt, logic tìm "Manager" (Quản lý trực tiếp) chưa được xử lý đồng nhất. Ở `signRequests`, logic này bị bỏ qua hoặc chưa hoàn thiện.

## 3. Cơ Sở Dữ Liệu (Database Schema)
*   **Dư thừa dữ liệu Role**:
    *   Bảng `users` có trường `role` (string).
    *   Lại có bảng `user_roles` (quan hệ n-n với bảng `roles`).
    *   **Rủi ro**: Dễ gây mâu thuẫn dữ liệu. Hệ thống sẽ check quyền theo trường nào?
*   **Quan hệ Document - SignRequest khó hiểu**:
    *   `documents` có `sign_request_id` (quan hệ 1-1).
    *   Nhưng cũng có quan hệ `sign_requests` (quan hệ 1-n).
    *   Cần làm rõ: Một văn bản có thể có nhiều yêu cầu ký không? Hay mỗi lần ký là một văn bản mới (version mới)?

## 4. Mã Nguồn (Code Quality)
*   **Dynamic Import**: Trong `signRequests.service.ts` có sử dụng `import('../common/email.service')` bên trong hàm. Điều này thường là dấu hiệu của việc xử lý vòng lặp phụ thuộc (circular dependency) một cách tạm bợ.
*   **Frontend**: Cấu trúc thư mục Frontend khá ổn (Next.js App Router), nhưng việc để quá nhiều file log và zip ở root cũng ảnh hưởng đến việc quản lý source code.

## Tổng Kết & Đề Xuất
Dự án có nền tảng công nghệ tốt (Next.js, NestJS/Express, Prisma), nhưng kiến trúc nghiệp vụ đang bị phân mảnh và tổ chức file quá lộn xộn.

**Đề xuất ưu tiên:**
1.  **Dọn dẹp Root**: Di chuyển docs vào `docs/`, scripts vào `scripts/`.
2.  **Hợp nhất Luồng Duyệt & Ký**: Nên coi "Ký" chỉ là một loại hành động trong "Workflow". Không nên tách ra thành 2 engine riêng biệt chạy song song.
3.  **Chuẩn hóa Role**: Xóa trường `role` trong bảng `users`, chỉ dùng `user_roles` cho RBAC.
