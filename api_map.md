# Bản đồ API chính (`/api/v1`)

Tài liệu này liệt kê các endpoint quan trọng (ở mức nhóm chức năng), dựa trên các file `*.routes.ts`.

---

## 1. Auth & Tenant

**Auth (`auth.routes.ts`)**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET  /api/v1/auth/me`

**Tenants (`tenants.routes.ts`)**
- `GET  /api/v1/tenants/me`

---

## 2. Users, Departments, Roles

**Users (`users.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/users/profile`
- `POST /api/v1/users/change-password`
- `GET  /api/v1/users`           (permission `users:read`)
- `GET  /api/v1/users/stats`     (permission `users:read`)
- `GET  /api/v1/users/:id`       (permission `users:read`)
- `POST /api/v1/users`           (permission `users:create`)
- `PUT  /api/v1/users/:id`       (permission `users:update`)
- `DELETE /api/v1/users/:id`     (permission `users:delete`)

**Departments (`departments.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/departments`
- `GET  /api/v1/departments/tree`
- `GET  /api/v1/departments/:id`
- `POST /api/v1/departments`
- `PUT  /api/v1/departments/:id`
- `DELETE /api/v1/departments/:id`

**Roles (`roles.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/roles`
- `GET  /api/v1/roles/permissions`
- `GET  /api/v1/roles/my-permissions`
- `GET  /api/v1/roles/:id`
- `POST /api/v1/roles`
- `PUT  /api/v1/roles/:id`
- `DELETE /api/v1/roles/:id`

---

## 3. Document Types & Numbering

**Document Types (`documentTypes.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/document-types`
- `GET  /api/v1/document-types/stats`
- `GET  /api/v1/document-types/:id`
- `POST /api/v1/document-types`
- `PUT  /api/v1/document-types/:id`
- `DELETE /api/v1/document-types/:id`

**Numbering Rules (`numbering.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/numbering-rules`
- `GET  /api/v1/numbering-rules/:documentTypeId`
- `POST /api/v1/numbering-rules`
- `PUT  /api/v1/numbering-rules/:id`
- `POST /api/v1/numbering-rules/generate`
- `POST /api/v1/numbering-rules/preview`

---

## 4. Documents & E‑Signature

**Documents (`documents.routes.ts`)** – yêu cầu `authGuard`
- `GET    /api/v1/documents`
- `GET    /api/v1/documents/:id`
- `POST   /api/v1/documents`
- `DELETE /api/v1/documents/:id`

**Sign Requests (`signRequests.routes.ts`)** – yêu cầu `authGuard`
- `GET  /api/v1/sign-requests`
- `POST /api/v1/sign-requests`
- `GET  /api/v1/sign-requests/:id`
- `POST /api/v1/sign-requests/:id/cancel`

**Signers (`signers.routes.ts`)** – yêu cầu `authGuard`
- `POST /api/v1/signers`
- `POST /api/v1/signers/:id/send-otp`
- `POST /api/v1/signers/:id/sign`

---

## 5. Audit & Webhooks

**Audit (`audit.routes.ts`)**
- `GET /api/v1/audit/:documentId`

**Webhooks (`webhooks.routes.ts`)**
- `POST /api/v1/webhooks/register`

---

## 6. Healthcheck & License Server

**Backend chính**
- `GET /health`

**License server**
- `GET /health`
- Các route kích hoạt/validate license nằm trong `license-server/src/modules/licenses/license.routes.ts` (service riêng, giao tiếp qua `/api/v1/...`).

