# Webhook và API Token

Tài liệu này là hướng dẫn đầy đủ để cấu hình webhook, tạo API token và tích hợp hệ thống ngoài với E-Office. Mục tiêu là sau khi đọc xong, người vận hành hoặc đội tích hợp có thể tự:

- tạo webhook nhận sự kiện từ E-Office
- xác thực payload webhook
- tạo API token để gọi API vào E-Office
- thu hồi token khi cần
- kiểm tra lỗi thường gặp trong quá trình tích hợp

## 1. Mục đích sử dụng

E-Office hỗ trợ 2 chiều tích hợp chính:

- `Webhook`: E-Office chủ động gọi ra ngoài khi có sự kiện phát sinh trong hệ thống
- `API Token`: hệ thống ngoài chủ động gọi API của E-Office thông qua `Authorization: Bearer <token>`

Nói ngắn gọn:

- webhook dùng để `nhận thông báo`
- API token dùng để `gọi vào hệ thống`

## 2. Truy cập màn hình cấu hình

Vào `Cấu hình` -> `Webhooks`.

Màn hình này có 3 khu vực:

- `Webhooks`: khai báo endpoint nhận sự kiện
- `API Token`: tạo token để hệ thống ngoài gọi API
- `Nhật ký gửi`: theo dõi lịch sử gửi webhook

Quyền truy cập:

- xem danh sách: cần quyền `webhooks:read`
- tạo webhook hoặc tạo token: cần quyền `webhooks:create`
- sửa webhook: cần quyền `webhooks:update`
- xóa webhook hoặc thu hồi token: cần quyền `webhooks:delete`

## 3. Cấu hình webhook

### 3.1. Các trường cần nhập

Khi tạo webhook, nhập các thông tin sau:

- `Endpoint URL`: địa chỉ mà E-Office sẽ gửi `POST` đến
- `Secret`: chuỗi bí mật dùng để tạo chữ ký xác thực webhook, có thể bỏ trống nhưng nên dùng
- `Sự kiện`: danh sách sự kiện muốn nhận
- `Trạng thái`: bật hoặc tắt webhook

Ví dụ endpoint:

```text
https://integration.example.com/hooks/eoffice
```

### 3.2. Cách E-Office gửi webhook

Khi có sự kiện phù hợp, E-Office sẽ gửi một request `POST` tới endpoint đã khai báo.

Headers:

```http
Content-Type: application/json
X-Esign-Event: sign.completed
X-Esign-Signature: <hmac_sha256_hex>
```

Ghi chú:

- `X-Esign-Event` cho biết loại sự kiện
- `X-Esign-Signature` chỉ có khi webhook có `secret`
- chữ ký được tạo bằng HMAC SHA-256 từ `raw body`

### 3.3. Payload mẫu

```json
{
  "event": "sign.completed",
  "payload": {
    "documentId": 123,
    "signRequestId": 45
  },
  "emitted_at": "2026-05-21T09:30:00.000Z"
}
```

Ý nghĩa:

- `event`: tên sự kiện
- `payload`: dữ liệu nghiệp vụ của sự kiện
- `emitted_at`: thời điểm E-Office phát sự kiện theo UTC ISO 8601

### 3.4. Các sự kiện hiện hỗ trợ

Danh sách sự kiện đang dùng trên giao diện:

- `document.created`
- `document.updated`
- `document.deleted`
- `approval.started`
- `approval.completed`
- `approval.rejected`
- `sign.started`
- `sign.completed`
- `sign.declined`

Lưu ý:

- chỉ những event được đăng ký mới được gửi
- nếu webhook không đăng ký event đó thì E-Office sẽ bỏ qua

## 4. Xác thực chữ ký webhook

Nếu có cấu hình `secret`, E-Office tạo chữ ký như sau:

```text
signature = HMAC_SHA256(secret, raw_request_body)
```

Giá trị này được gửi trong header:

```http
X-Esign-Signature: <hex>
```

### 4.1. Ví dụ xác thực bằng Node.js

```js
const crypto = require("crypto");

function verifyWebhookSignature(rawBody, secret, signatureFromHeader) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signatureFromHeader;
}
```

### 4.2. Khuyến nghị khi triển khai endpoint nhận webhook

- lưu `raw body` trước khi parse JSON
- xác thực chữ ký trước khi xử lý nghiệp vụ
- trả về HTTP `2xx` khi đã nhận thành công
- log lại `event`, `emitted_at`, `status`, `requestId` nếu hệ thống ngoài có

## 5. Tạo API token

Tab `API Token` dùng để cấp token cho hệ thống ngoài gọi vào E-Office.

### 5.1. Cách tạo token trên giao diện

1. Vào tab `API Token`
2. Nhập tên token, ví dụ:

```text
ERP Integration
```

3. Bấm `Tạo API token`
4. Sao chép token ngay khi hệ thống hiển thị

### 5.2. Quy tắc hoạt động của token

- token chỉ hiển thị đầy đủ đúng `1 lần`
- hệ thống chỉ lưu `hash`, không lưu lại token thô để xem lại
- token kế thừa quyền của user đã tạo token
- nếu user tạo token bị vô hiệu hóa thì token cũng không dùng được
- có thể thu hồi token bất kỳ lúc nào

### 5.3. Khi nào nên tạo nhiều token

Nên tạo token riêng cho từng hệ thống tích hợp:

- 1 token cho ERP
- 1 token cho CRM
- 1 token cho cổng dịch vụ công
- 1 token cho môi trường test

Lợi ích:

- dễ thu hồi từng kết nối
- dễ truy vết lần sử dụng cuối
- giảm rủi ro lộ một token làm ảnh hưởng toàn bộ tích hợp

## 6. Gọi API bằng API token

Mọi request gọi vào E-Office bằng token đều dùng header:

```http
Authorization: Bearer <API_TOKEN>
```

### 6.1. Ví dụ lấy danh sách tài liệu

```bash
curl -X GET "http://localhost:4000/api/v1/documents" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json"
```

### 6.2. Ví dụ lấy danh sách webhook

```bash
curl -X GET "http://localhost:4000/api/v1/webhooks" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json"
```

### 6.3. Ví dụ tạo webhook qua API

```bash
curl -X POST "http://localhost:4000/api/v1/webhooks" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/hooks/eoffice",
    "events": ["sign.completed"],
    "secret": "your-webhook-secret",
    "active": true
  }'
```

### 6.4. Ví dụ response thành công

```json
{
  "success": true,
  "data": {
    "id": 12,
    "url": "https://example.com/hooks/eoffice",
    "events": ["sign.completed"],
    "secret": "your-webhook-secret",
    "active": true,
    "tenant_id": 1,
    "created_at": "2026-05-21T10:00:00.000Z",
    "updated_at": "2026-05-21T10:00:00.000Z"
  }
}
```

## 7. API quản lý token

Ngoài giao diện, token cũng có thể được quản lý qua API.

### 7.1. Liệt kê token

```http
GET /api/v1/webhooks/api-tokens
```

Ví dụ:

```bash
curl -X GET "http://localhost:4000/api/v1/webhooks/api-tokens" \
  -H "Authorization: Bearer <ACCESS_TOKEN_OR_API_TOKEN>"
```

Response mẫu:

```json
{
  "success": true,
  "data": [
    {
      "id": "581a9db3-4e24-4793-a41e-c50a039abbba",
      "name": "ERP Integration",
      "token_prefix": "esign_8f3c4...",
      "tenant_id": 1,
      "created_by_user_id": 1,
      "created_by_email": "admin@acme.local",
      "created_at": "2026-05-21T10:10:00.000Z",
      "last_used_at": "2026-05-21T10:12:00.000Z",
      "revoked_at": null
    }
  ]
}
```

### 7.2. Tạo token

```http
POST /api/v1/webhooks/api-tokens
```

Body:

```json
{
  "name": "ERP Integration"
}
```

Ví dụ:

```bash
curl -X POST "http://localhost:4000/api/v1/webhooks/api-tokens" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ERP Integration"
  }'
```

Response mẫu:

```json
{
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
}
```

Lưu ý rất quan trọng:

- trường `token` chỉ xuất hiện ở response tạo mới
- các API list sau đó chỉ trả `token_prefix`

### 7.3. Thu hồi token

```http
DELETE /api/v1/webhooks/api-tokens/{tokenId}
```

Ví dụ:

```bash
curl -X DELETE "http://localhost:4000/api/v1/webhooks/api-tokens/581a9db3-4e24-4793-a41e-c50a039abbba" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Sau khi thu hồi:

- token không còn gọi API được nữa
- `revoked_at` sẽ có giá trị

## 8. API quản lý webhook

Đây là các API chính cho webhook.

### 8.1. Tạo webhook

```http
POST /api/v1/webhooks
```

Body:

```json
{
  "url": "https://example.com/hooks/eoffice",
  "events": ["sign.completed", "approval.completed"],
  "secret": "your-webhook-secret",
  "active": true
}
```

### 8.2. Lấy danh sách webhook

```http
GET /api/v1/webhooks
```

### 8.3. Xem chi tiết webhook

```http
GET /api/v1/webhooks/{id}
```

### 8.4. Cập nhật webhook

```http
PUT /api/v1/webhooks/{id}
```

Body ví dụ:

```json
{
  "active": false,
  "events": ["sign.completed"]
}
```

### 8.5. Xóa webhook

```http
DELETE /api/v1/webhooks/{id}
```

### 8.6. Xem log gửi webhook

```http
GET /api/v1/webhooks/{id}/logs
```

Có thể truyền thêm:

```http
GET /api/v1/webhooks/{id}/logs?limit=100
```

## 9. Quyền hạn và bảo mật

### 9.1. API token kế thừa quyền của ai

API token kế thừa đúng quyền của user tạo token.

Ví dụ:

- nếu user có quyền `documents:read` thì token đọc được tài liệu
- nếu user không có quyền `webhooks:create` thì token không tạo được webhook

Điều này giúp không cần tạo cơ chế quyền riêng cho token, nhưng cũng có nghĩa là:

- không nên dùng tài khoản có quyền quá rộng để tạo token tích hợp nếu không cần

### 9.2. Khuyến nghị bảo mật

- luôn dùng `HTTPS`
- dùng `secret` cho mọi webhook production
- tách token cho từng hệ thống tích hợp
- đặt tên token rõ ràng để dễ quản trị
- thu hồi token ngay khi nghi ngờ lộ lọt
- không hard-code token trong frontend public
- ưu tiên lưu token trong secret manager hoặc biến môi trường

### 9.3. Nên làm trong production

- whitelist IP nếu hệ thống ngoài hỗ trợ
- log đầy đủ request nhận webhook
- cảnh báo khi webhook trả lỗi liên tục
- định kỳ rà soát token cũ không còn sử dụng

## 10. Quy trình tích hợp khuyến nghị

Một quy trình chuẩn để tích hợp với hệ thống ngoài:

1. Tạo một user kỹ thuật hoặc dùng user quản trị phù hợp
2. Gán đúng quyền tối thiểu cần thiết
3. Vào `Cấu hình -> Webhooks`
4. Tạo API token riêng cho hệ thống tích hợp
5. Tạo webhook với endpoint thật của hệ thống ngoài
6. Cấu hình secret ở cả hai đầu
7. Test tạo webhook và gọi thử API bằng token
8. Test nhận event thật như `sign.completed`
9. Kiểm tra log gửi webhook
10. Đưa vào production

## 11. Kiểm tra và xử lý lỗi

### 11.1. Lỗi `401 Unauthorized`

Nguyên nhân thường gặp:

- thiếu header `Authorization`
- token sai
- token đã bị thu hồi
- user tạo token đã bị vô hiệu hóa

Cách kiểm tra:

- xác nhận format header là `Bearer <token>`
- tạo token mới rồi test lại
- kiểm tra tab `API Token` xem token đã bị thu hồi chưa

### 11.2. Lỗi `403 Permission denied`

Nguyên nhân:

- token hợp lệ nhưng user tạo token không có quyền phù hợp

Cách xử lý:

- kiểm tra role của user tạo token
- cấp đúng quyền cần thiết
- tạo lại token nếu cần dùng user khác

### 11.3. Webhook không nhận được dữ liệu

Nguyên nhân có thể là:

- URL sai
- endpoint ngoài chặn request
- SSL/TLS ở đầu nhận không hợp lệ
- event chưa được đăng ký
- webhook đang ở trạng thái tắt

Checklist:

- xác nhận URL truy cập được từ ngoài
- xác nhận webhook đang `Active`
- xác nhận event cần nghe đã được tick
- xem log của hệ thống ngoài
- xem log gửi webhook trong E-Office

### 11.4. Chữ ký webhook không khớp

Nguyên nhân thường gặp:

- secret 2 bên khác nhau
- dùng JSON đã parse lại thay vì `raw body`
- hệ thống ngoài tự thay đổi payload trước khi verify

Cách xử lý:

- dùng chính `raw request body`
- kiểm tra secret ở cả 2 bên
- kiểm tra thuật toán là `HMAC SHA-256`

## 12. Ví dụ tích hợp tối thiểu

### 12.1. Hệ thống ngoài nhận webhook

Ví dụ luồng đơn giản:

1. E-Office gửi `POST` tới `/hooks/eoffice`
2. Hệ thống ngoài verify `X-Esign-Signature`
3. Parse `event`
4. Nếu `event = sign.completed` thì cập nhật trạng thái hồ sơ nội bộ

### 12.2. Hệ thống ngoài gọi lại E-Office

Sau khi lưu token:

1. gửi `GET /api/v1/documents`
2. hoặc `GET /api/v1/webhooks`
3. hoặc `POST /api/v1/webhooks` để đăng ký endpoint mới

## 13. Tóm tắt nhanh

Nếu cần triển khai nhanh, chỉ cần nhớ:

- webhook là để E-Office gọi ra ngoài
- API token là để hệ thống ngoài gọi vào E-Office
- webhook nên luôn có `secret`
- token chỉ hiện đầy đủ đúng 1 lần
- token kế thừa quyền của user tạo token
- có thể thu hồi token ngay trên màn hình `Webhooks`

## 14. Tài liệu liên quan

- API tổng quan: [docs/api-spec.md](d:/Public Workspace%20-%20Example Organization/Documents/E-SIGN/e-office/docs/api-spec.md:1)
- Flow nghiệp vụ: [docs/business-flows.md](d:/Public Workspace%20-%20Example Organization/Documents/E-SIGN/e-office/docs/business-flows.md:1)
- Màn hình quản lý: [frontend/app/(dashboard)/webhooks/page.tsx](d:/Public Workspace%20-%20Example Organization/Documents/E-SIGN/e-office/frontend/app/(dashboard)/webhooks/page.tsx:237)
