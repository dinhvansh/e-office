# Kế hoạch nâng cấp bảo mật WP Sign (dành cho dev)

## Mục tiêu ngắn hạn (1–2 ngày)
- **Rate limit & CORS an toàn**
  - Thêm rate-limit per IP cho `auth/login`, OTP, webhook (`express-rate-limit` hoặc middleware tương đương).
  - CORS: chuyển sang whitelist domain (env `CORS_ORIGIN`), bỏ `*` khi `credentials:true`.
- **JWT/Token**
  - Thêm blacklist/rotation cho refresh token (Redis), kiểm tra trạng thái user/tenant mỗi lần verify.
  - Thiết lập thời gian sống hợp lý, chuẩn bị secret rotation (đọc từ env versioned).
- **Upload**
  - Kiểm MIME và giới hạn dung lượng theo plan; thêm hook AV scan (TODO nếu chưa có scanner).
  - Không trả OTP trong response (kể cả dev).
- **Security headers**
  - Bật Helmet full profile: CSP, X-Frame-Options, Referrer-Policy, HSTS (chỉ prod).

## Trung hạn (3–7 ngày)
- **Webhook an toàn**
  - Lưu cấu hình webhook theo tenant trong DB, ký request (HMAC), retry/backoff, chặn SSRF (allowlist hoặc cidr block private IP).
  - Audit event khi đăng ký/webhook fail.
- **Storage & tải xuống**
  - Chuyển sang S3/MinIO với signed URL download, tách bucket/theo prefix tenant.
  - Kiểm soát phiên bản & checksum; ghi audit khi tải xuống/xóa.
- **Audit & logging**
  - Log thất bại đăng nhập/OTP, thay đổi license, hành động admin; ẩn stack trace ở prod.
- **License server**
  - Thêm rate-limit, audit, ràng buộc hardware_id khi cấp offline license; chuẩn bị key rotation.

## Dài hạn (Phase 3+)
- **SaaS billing & limits**
  - Áp quota (số tài liệu/người dùng) theo plan, chặn ở service layer + hiển thị UI.
- **SSO/PKI/2FA**
  - Chuẩn bị flow SSO, PKI ký số, 2FA cho user nội bộ.
- **DevSecOps**
- Thêm CI step: lint + `npm audit`/`pnpm audit`, SAST cơ bản; policy fail khi critical.

## Công việc cụ thể (ưu tiên thực thi)
1) Thêm rate-limit + CORS whitelist vào `backend/src/app.ts`.
2) Bật Helmet CSP + HSTS (prod), headers cơ bản.
3) Xóa leak OTP dev; siết validation email/độ dài input.
4) Add webhook persistence + signing + retry, SSRF guard.
5) Triển khai signed URL và MIME check cho upload; AV hook (TODO).
6) Log/auth fail & admin/license actions; ẩn stack trace prod.
