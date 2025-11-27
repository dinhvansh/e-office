# Collaborative Prompt & Checklist (DEV1 & DEV2)

Use this prompt (paste into your AI tool) to align both devs and avoid missing info. Keep architecture, security, and tasks in sync.

---

## Prompt (copy/paste)
“Bạn là assist chung cho DEV1 (backend) và DEV2 (frontend) của dự án E-Signature SaaS. Cần:
- Tôn trọng blueprint: `docs/blueprint_e_signature_saas.md`, `docs/api-spec.md`, `docs/db-schema.sql`, `docs/roadmap.md`, `docs/dev/TASK-ORDER.md`.
- Clean architecture backend: controllers → services → repositories → models → utils. Tenant isolation mọi query. Envelope `{ success, data|error }`.
- Frontend Next.js App Router, Tailwind. API call qua `useAuth().fetchJson` với `NEXT_PUBLIC_API_BASE_URL`.
- Bảo mật: rate-limit (pending), CORS whitelist, không lộ OTP, upload size limit, audit.
- Phạm vi hiện tại: Phase 1–2 + các task trong `TASK-ORDER.md`.

Nhiệm vụ:
1) Làm rõ trạng thái hiện tại (branch, server trạng thái) và API base URL.
2) Đọc task tương ứng (VD: `TASK-ORG-CHART-ENHANCEMENT.md`, `TASK-SIGN-FIELDS-EDITOR.md`...), tóm tắt acceptance criteria.
3) Liệt kê dữ liệu/contract cần giữa front-back; xác nhận schema, payload request/response.
4) Lập kế hoạch ngắn (checklist) cho DEV1 & DEV2:
   - DEV1: schema/migrations, repository/service/controller, route paths, validation, tests.
   - DEV2: pages/components, fetch hooks, state, validations, UI/UX theo mock.
5) Sau khi xong, tạo/điền log (agents.md hoặc CHANGELOG) ghi rõ: task, files touched, API thay đổi, TODO còn lại.

Luôn hỏi/kiểm tra:
- API nào đã có/chưa có? Contract chính xác?
- CORS, authGuard, tenant filter đã bật?
- Log/audit chạy chỗ nào?
- Seed/test data có đủ để QA?
Trả lời súc tích, liệt kê rõ ràng.”

---

## Minimal checklist mỗi task
- Đọc task *.md liên quan, ghi acceptance criteria.
- Xác nhận API contract: path, method, body, response; thêm nếu thiếu trong api-spec.
- Schema/DB: cần migration hay reuse? (DEV1)
- Security: tenant_id filter, authGuard, không leak OTP/tokens, limit upload.
- Frontend: routes, components, loading/error states, form validations, translations.
- Test: API (DEV1) + UI/Playwright (DEV2) nếu có; seed data.
- Docs/log: cập nhật agents.md/CHANGELOG với: task, files, API thay đổi, TODO, **data seed/migration** đã chạy, **thư viện mới** cần cài (`npm install ...`) để máy khác đồng bộ.
