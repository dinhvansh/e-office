import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound, ShieldCheck, Webhook } from "lucide-react";

export const metadata: Metadata = {
  title: "Webhook và API Token | E-Office",
  description: "Hướng dẫn public để cấu hình webhook, tạo API token và tích hợp hệ thống ngoài với E-Office.",
};

const events = [
  "document.created",
  "document.updated",
  "document.deleted",
  "approval.started",
  "approval.completed",
  "approval.rejected",
  "sign.started",
  "sign.completed",
  "sign.declined",
];

const apiTokenSample = `Authorization: Bearer <API_TOKEN>`;

const curlListDocuments = `curl -X GET "http://localhost:4000/api/v1/documents" \\
  -H "Authorization: Bearer <API_TOKEN>" \\
  -H "Content-Type: application/json"`;

const curlCreateWebhook = `curl -X POST "http://localhost:4000/api/v1/webhooks" \\
  -H "Authorization: Bearer <API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/hooks/eoffice",
    "events": ["sign.completed"],
    "secret": "your-webhook-secret",
    "active": true
  }'`;

const createTokenResponse = `{
  "success": true,
  "data": {
    "token": "esign_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "metadata": {
      "id": "581a9db3-4e24-4793-a41e-c50a039abbba",
      "name": "ERP Integration",
      "token_prefix": "esign_xxxxx...",
      "tenant_id": 1,
      "created_by_user_id": 1,
      "created_by_email": "admin@acme.local",
      "created_at": "2026-05-21T10:10:00.000Z",
      "last_used_at": null,
      "revoked_at": null
    }
  }
}`;

const webhookPayload = `{
  "event": "sign.completed",
  "payload": {
    "documentId": 123,
    "signRequestId": 45
  },
  "emitted_at": "2026-05-21T09:30:00.000Z"
}`;

const verifyNode = `const crypto = require("crypto");

function verifyWebhookSignature(rawBody, secret, signatureFromHeader) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signatureFromHeader;
}`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-4 text-slate-700">{children}</div>
    </section>
  );
}

export default function WebhooksApiTokenDocsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/webhooks"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại màn Webhooks
          </Link>

          <a
            href="#quick-start"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            Xem cách triển khai nhanh
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Documentation</p>
            <nav className="space-y-2 text-sm">
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#overview">Tổng quan</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#webhook">Cấu hình webhook</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#signature">Xác thực chữ ký</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#api-token">API token</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#api-usage">Gọi API</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#token-api">API quản lý token</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#webhook-api">API quản lý webhook</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#security">Bảo mật</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#quick-start">Triển khai nhanh</a>
              <a className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100" href="#troubleshooting">Xử lý lỗi</a>
            </nav>
          </aside>

          <div className="space-y-8">
            <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur">
              <div className="mb-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
                  <Webhook className="h-4 w-4" />
                  Webhook
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                  <KeyRound className="h-4 w-4" />
                  API Token
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  <ShieldCheck className="h-4 w-4" />
                  Public Docs
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Tích hợp E-Office bằng Webhook và API Token
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                Trang này hướng dẫn đầy đủ cách để hệ thống ngoài nhận sự kiện từ E-Office, gọi API vào E-Office, xác thực
                chữ ký webhook và vận hành an toàn trong môi trường production.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Dùng khi cần</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Nhận thông báo tự động</p>
                <p className="mt-2 text-sm text-slate-600">Dùng webhook để nhận sự kiện như `sign.completed`, `approval.completed`.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Dùng khi cần</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Gọi API có xác thực</p>
                <p className="mt-2 text-sm text-slate-600">Dùng API token để gọi các route có bảo vệ quyền trong E-Office.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Lưu ý quan trọng</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Token chỉ hiện 1 lần</p>
                <p className="mt-2 text-sm text-slate-600">Hệ thống chỉ hiển thị token đầy đủ khi vừa tạo xong, sau đó chỉ còn tiền tố.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="overview" title="1. Tổng quan">
                <p>
                  E-Office hỗ trợ 2 chiều tích hợp chính. `Webhook` dùng khi E-Office cần chủ động gọi ra ngoài. `API Token`
                  dùng khi hệ thống ngoài cần chủ động gọi vào E-Office.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">Webhook</p>
                    <p className="mt-2 text-sm">Dùng để nhận thông báo khi tài liệu được tạo, phê duyệt hoàn tất, ký điện tử hoàn tất.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">API Token</p>
                    <p className="mt-2 text-sm">Dùng để gọi các API như danh sách tài liệu, danh sách webhook, tạo webhook mới.</p>
                  </div>
                </div>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="webhook" title="2. Cấu hình webhook">
                <p>Vào `Cấu hình` -&gt; `Webhooks`, sau đó tạo webhook với các trường sau:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>`Endpoint URL`: địa chỉ nhận `POST` từ E-Office</li>
                  <li>`Secret`: chuỗi bí mật để ký `X-Esign-Signature`</li>
                  <li>`Sự kiện`: danh sách sự kiện muốn nhận</li>
                  <li>`Trạng thái`: bật hoặc tắt webhook</li>
                </ul>
                <p className="font-semibold text-slate-900">Headers gửi kèm</p>
                <CodeBlock>{`Content-Type: application/json
X-Esign-Event: sign.completed
X-Esign-Signature: <hmac_sha256_hex>`}</CodeBlock>
                <p className="font-semibold text-slate-900">Payload mẫu</p>
                <CodeBlock>{webhookPayload}</CodeBlock>
                <p className="font-semibold text-slate-900">Các sự kiện hiện hỗ trợ</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <div key={event} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {event}
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="signature" title="3. Xác thực chữ ký webhook">
                <p>
                  Nếu webhook có `secret`, E-Office tạo chữ ký bằng `HMAC SHA-256` từ `raw request body` và gửi qua header
                  `X-Esign-Signature`.
                </p>
                <CodeBlock>{verifyNode}</CodeBlock>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Luôn verify chữ ký trước khi xử lý nghiệp vụ</li>
                  <li>Dùng `raw body`, không dùng JSON stringify lại</li>
                  <li>Trả HTTP `2xx` khi endpoint nhận thành công</li>
                </ul>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="api-token" title="4. API token">
                <p>Trong tab `API Token`, nhập tên token rồi bấm `Tạo API token`.</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Token đầy đủ chỉ hiển thị đúng 1 lần</li>
                  <li>Hệ thống chỉ lưu `hash`, không thể xem lại token thô</li>
                  <li>Token kế thừa đúng quyền của user tạo token</li>
                  <li>Token có thể bị thu hồi bất cứ lúc nào</li>
                </ul>
                <p className="font-semibold text-slate-900">Header xác thực</p>
                <CodeBlock>{apiTokenSample}</CodeBlock>
                <p className="font-semibold text-slate-900">Response khi tạo token</p>
                <CodeBlock>{createTokenResponse}</CodeBlock>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="api-usage" title="5. Gọi API bằng token">
                <p className="font-semibold text-slate-900">Ví dụ lấy danh sách tài liệu</p>
                <CodeBlock>{curlListDocuments}</CodeBlock>
                <p className="font-semibold text-slate-900">Ví dụ tạo webhook qua API</p>
                <CodeBlock>{curlCreateWebhook}</CodeBlock>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="token-api" title="6. API quản lý token">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">Liệt kê token</p>
                  <CodeBlock>{`GET /api/v1/webhooks/api-tokens`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">Tạo token</p>
                  <CodeBlock>{`POST /api/v1/webhooks/api-tokens

{
  "name": "ERP Integration"
}`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">Thu hồi token</p>
                  <CodeBlock>{`DELETE /api/v1/webhooks/api-tokens/{tokenId}`}</CodeBlock>
                </div>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="webhook-api" title="7. API quản lý webhook">
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "POST /api/v1/webhooks",
                    "GET /api/v1/webhooks",
                    "GET /api/v1/webhooks/{id}",
                    "PUT /api/v1/webhooks/{id}",
                    "DELETE /api/v1/webhooks/{id}",
                    "GET /api/v1/webhooks/{id}/logs?limit=100",
                  ].map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
                      {item}
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="security" title="8. Quyền hạn và bảo mật">
                <p>
                  API token kế thừa đúng quyền của user tạo token. Vì vậy nên dùng tài khoản có quyền tối thiểu phù hợp cho từng
                  tích hợp.
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Luôn dùng HTTPS cho cả webhook và API</li>
                  <li>Dùng secret riêng cho từng webhook production</li>
                  <li>Tách token theo từng hệ thống tích hợp</li>
                  <li>Không hard-code token trong frontend public</li>
                  <li>Thu hồi token ngay khi nghi ngờ lộ lọt</li>
                </ul>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="quick-start" title="9. Triển khai nhanh">
                <ol className="list-decimal space-y-2 pl-6">
                  <li>Tạo user kỹ thuật hoặc chọn user phù hợp</li>
                  <li>Gán đúng quyền cần dùng</li>
                  <li>Tạo API token riêng cho hệ thống tích hợp</li>
                  <li>Tạo webhook với endpoint thật</li>
                  <li>Cấu hình secret ở cả 2 đầu</li>
                  <li>Test một API đơn giản bằng token</li>
                  <li>Test nhận event thật như `sign.completed`</li>
                  <li>Kiểm tra log gửi webhook và log của hệ thống ngoài</li>
                </ol>
              </Section>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Section id="troubleshooting" title="10. Xử lý lỗi thường gặp">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <p className="font-semibold text-rose-900">401 Unauthorized</p>
                    <p className="mt-2 text-sm text-rose-800">
                      Thường do token sai, token đã bị thu hồi, thiếu header `Authorization` hoặc user tạo token đã bị vô hiệu hóa.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="font-semibold text-amber-900">403 Permission denied</p>
                    <p className="mt-2 text-sm text-amber-800">
                      Token hợp lệ nhưng user tạo token không có quyền phù hợp để gọi route đó.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                    <p className="font-semibold text-sky-900">Webhook không tới endpoint</p>
                    <p className="mt-2 text-sm text-sky-800">
                      Kiểm tra lại URL, trạng thái `Active`, event đã đăng ký, SSL/TLS của đầu nhận và log của hệ thống ngoài.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="font-semibold text-emerald-900">Chữ ký webhook không khớp</p>
                    <p className="mt-2 text-sm text-emerald-800">
                      Kiểm tra `secret`, đảm bảo verify trên `raw body` và dùng đúng HMAC SHA-256.
                    </p>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
