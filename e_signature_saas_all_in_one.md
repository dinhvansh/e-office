# SAAS E-SIGNATURE SYSTEM – FULL MASTER BLUEPRINT (CHO CURSOR)

## 1. SYSTEM OVERVIEW
- **Cloud SaaS (multi-tenant)**
- **On-Premise Version (single tenant, license-based)**

---

## 2. CORE FEATURES

### 2.1 Document Management
- Upload PDF  
- Versioning  
- Tags, folders  
- Permissions  

### 2.2 Signing Workflow
- Create signing request  
- Assign signers  
- Drag/drop signature fields  
- Status flow (draft → sent → completed → declined)

### 2.3 Signature Methods
- E-sign  
- OTP (email/SMS)  
- PKI certificate signing  

### 2.4 Audit Trail
- IP  
- User agent  
- Actions log  
- Timestamps  

### 2.5 QR Code Verification
- Embed QR into PDF  
- Public verification page  

### 2.6 Template System
- PDF templates  
- Dynamic field mapping  

### 2.7 Multi-Tenant
- Tenant isolation  
- Custom branding  
- Resource limits  

### 2.8 User Management
- RBAC (admin, manager, user, viewer)  
- Invitation system  
- 2FA  

### 2.9 API + Webhooks
- REST API  
- Webhooks for document events  

---

## 3. SAAS BILLING SYSTEM
- Usage limits  
- Subscription: Free / Basic / Pro / Enterprise  
- Stripe / PayPal / Momo  
- Auto-suspend & grace period  

---

## 4. ON-PREM SYSTEM
- Offline license  
- Activation server  
- Docker installer  
- Backup / Restore  

---

## 5. SYSTEM ARCHITECTURE
- **Backend:** NodeJS/NestJS, Laravel, or Python FastAPI  
- **Frontend:** Next.js + TailwindCSS  
- **Storage:** S3 / MinIO  
- **Database:** PostgreSQL  
- **Queue:** Redis / BullMQ  

---

## 6. DATABASE SCHEMA

### tenants
- id  
- name  
- domain  
- logo_url  
- plan  
- status  
- created_at  

### users
- id  
- tenant_id  
- email  
- password_hash  
- role  
- status  
- created_at  

### documents
- id  
- tenant_id  
- owner_id  
- file_path  
- hash  
- status  
- version  
- created_at  

### sign_requests
- id  
- tenant_id  
- document_id  
- title  
- message  
- workflow_type  
- status  
- deadline  
- created_at  

### signers
- id  
- sign_request_id  
- email  
- name  
- role  
- status  
- otp  
- otp_expire  
- signed_at  
- position_data (JSON)  

### audit_logs
- id  
- document_id  
- event  
- user_id  
- ip  
- ua  
- created_at  

### license (on-prem)
- id  
- tenant  
- license_key  
- expire_date  
- limit_user  
- limit_docs  
- signature  

---

## 7. DEVELOPMENT ROADMAP

### Phase 1 – Core
- Auth, tenant, upload PDF  
- Signing workflow  
- Basic viewer & fields  

### Phase 2 – Advanced
- OTP  
- Audit trail  
- QR  
- Templates  
- Webhooks  

### Phase 3 – SaaS Layer
- Subscription  
- Billing  
- Usage tracking  

### Phase 4 – On-Prem
- Activation server  
- Offline license  
- Installer  

### Phase 5 – Enterprise
- PKI  
- HSM  
- SSO  

---

## 8. FOLDER STRUCTURE (FOR CURSOR)

```
/apps
  /backend
  /frontend
/libs
  /pdf-engine
  /types
  /utils
/docs
  blueprint.md
  api-spec.md
  db-schema.sql
/onprem
  installer.sh
  docker-compose.yaml
  license-server/
/saas
  billing
  admin
```

---

## 9. PROMPTS FOR CURSOR

### Generate Backend
```
Follow docs/blueprint.md.
Build NestJS backend with modules: auth, tenants, documents, sign-requests, signers, audit-logs, billing.
```

### Generate Frontend
```
Create Next.js UI with PDF viewer, drag/drop signature fields, document dashboard, and signing flow.
```

### Generate Activation Server
```
Generate standalone NodeJS service for license activation based on On-Prem section in blueprint.md.
```



---

# API Specification – E-Signature SaaS

## Authentication
### POST /api/v1/auth/login
- email
- password

### POST /api/v1/auth/refresh
- refresh_token

---

## Tenants
### GET /api/v1/tenants/me
Returns current tenant info.

---

## Documents
### POST /api/v1/documents
Upload PDF document.

### GET /api/v1/documents
List documents.

### GET /api/v1/documents/{id}
Get document detail.

### DELETE /api/v1/documents/{id}
Delete a document.

---

## Sign Requests
### POST /api/v1/sign-requests
Create new signing request.

### GET /api/v1/sign-requests/{id}
Get signing request detail.

### POST /api/v1/sign-requests/{id}/cancel
Cancel the request.

---

## Signers
### POST /api/v1/signers
Add signer to request.

### POST /api/v1/signers/{id}/send-otp
Send OTP to signer.

### POST /api/v1/signers/{id}/sign
Submit signature data.

---

## Audit Logs
### GET /api/v1/audit/{document_id}
Returns audit log for a document.

---

## Webhooks
### POST /api/v1/webhooks/register
Register a webhook endpoint.

### Events
- document.uploaded
- sign.started
- sign.completed
- sign.declined



---

# DB Schema

```sql

-- Tenants
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    domain VARCHAR(255),
    plan VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    owner_id INT REFERENCES users(id),
    file_path TEXT NOT NULL,
    hash TEXT,
    status VARCHAR(20),
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sign Requests
CREATE TABLE sign_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    document_id INT REFERENCES documents(id),
    title VARCHAR(255),
    message TEXT,
    workflow_type VARCHAR(50),
    status VARCHAR(20),
    deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Signers
CREATE TABLE signers (
    id SERIAL PRIMARY KEY,
    sign_request_id INT REFERENCES sign_requests(id),
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50),
    status VARCHAR(20),
    otp VARCHAR(10),
    otp_expire TIMESTAMP,
    signed_at TIMESTAMP,
    position_data JSONB
);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id),
    event VARCHAR(255),
    user_id INT REFERENCES users(id),
    ip VARCHAR(50),
    ua TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- License (On-Prem)
CREATE TABLE license (
    id SERIAL PRIMARY KEY,
    tenant VARCHAR(255),
    license_key VARCHAR(255),
    expire_date DATE,
    limit_user INT,
    limit_docs INT,
    signature TEXT
);

```


---

# Development Roadmap

## Phase 1 – Core Platform
- Authentication
- Tenant management
- Document upload
- PDF viewer integration
- Signing fields UI
- Basic signing workflow

## Phase 2 – Advanced Features
- OTP signing
- Audit trail
- Template system
- QR verification
- Webhooks
- API integrations

## Phase 3 – SaaS Layer
- Billing integration (Stripe/Momo)
- Usage limits
- Subscription management
- Admin panel for SaaS Owner

## Phase 4 – On-Premise Edition
- License activation server
- Offline activation file
- Docker installer
- Self-host admin console

## Phase 5 – Enterprise Features
- PKI digital signing
- HSM integration
- LDAP/SSO (Azure AD, Google Workspace)
- Enterprise audit compliance




---

# Cursor Prompt Master – E-Signature SaaS

> Mục tiêu: dùng file này như “menu lệnh” cho Cursor để build dần toàn bộ hệ thống.  
> Cách dùng: mở file này trong VS Code, chọn đoạn prompt → chuột phải → “Ask Cursor” (hoặc dùng shortcut tương ứng).

---

## 0. Global Setup Prompts

### 0.1. Hiểu toàn bộ dự án

**Prompt:**

Read all docs in the `docs/` folder, especially:

- `docs/blueprint_e_signature_saas.md`
- `docs/api-spec.md`
- `docs/db-schema.sql`
- `docs/roadmap.md`

Then:
1. Summarize the architecture, main modules, and data model.
2. Confirm the tech stack you will use for:
   - backend (`backend/`)
   - frontend (`frontend/`)
   - license server (`license-server/`)
3. Propose a high-level implementation plan that aligns with `docs/roadmap.md`.

Do NOT write any code yet, just analysis and plan.

---

### 0.2. Giữ context & style chung

**Prompt:**

From now on, for this repository:

- Always follow the specifications in `docs/blueprint_e_signature_saas.md` and `docs/api-spec.md`.
- Respect the database structure from `docs/db-schema.sql`.
- Use clean architecture:
  - keep routing, controller, service, and data access layers separated
  - avoid putting business logic directly in route handlers
- Before editing any file, quickly scan related files (models, routes, services) to maintain consistency.

Confirm you understand and restate these rules in your own words.

---

## 1. Backend – API & Business Logic

### 1.1. Khởi tạo cấu trúc backend sạch

**Prompt:**

In the `backend/` folder, refactor the current minimal Express + TypeScript setup into a modular structure:

- `src/app.ts` – express app setup (middlewares, routes)
- `src/server.ts` – bootstrapping & listening
- `src/config/` – env, DB config
- `src/modules/` – each domain module:
  - `auth/`
  - `tenants/`
  - `users/`
  - `documents/`
  - `signRequests/`
  - `signers/`
  - `audit/`

Use the API endpoints defined in `docs/api-spec.md`. Create empty controllers and services with TODO comments. Ensure TypeScript types are correct.

---

### 1.2. Kết nối PostgreSQL và ORM

**Prompt:**

Wire the backend to PostgreSQL according to `docs/db-schema.sql`.

- Choose a simple ORM or query builder (e.g., Knex, Prisma, or TypeORM).
- Create database models that map to:
  - `tenants`
  - `users`
  - `documents`
  - `sign_requests`
  - `signers`
  - `audit_logs`
- Implement a reusable DB connection module in `src/config/db.ts`.

Do not implement complex logic yet, only:
- connection
- basic model definitions
- simple health check endpoint that confirms DB connectivity.

---

### 1.3. Auth & Tenant Context

**Prompt:**

Implement authentication and tenant context:

1. Implement `POST /api/v1/auth/login`:
   - Read `email`, `password` from body.
   - Verify user against DB.
   - Return access token + refresh token (JWT is fine).
2. Implement a middleware to:
   - decode JWT
   - attach `user` and `tenant` info to `req`
3. Ensure all protected routes require a valid token and tenant context.

Follow the requirements hinted in `docs/blueprint_e_signature_saas.md`. For now, you can use simple password hashing (bcrypt) and symmetric JWT signing (HS256).

---

### 1.4. API cho Documents

**Prompt:**

Implement the Documents API in `backend/` according to `docs/api-spec.md`:

- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `POST /api/v1/documents`
- `DELETE /api/v1/documents/:id`

Requirements:

- Respect `tenant_id` and `owner_id` from `docs/db-schema.sql`.
- Use a simple storage strategy:
  - For now, just store file path as a string and simulate upload with metadata only.
  - Add TODO comments where real file upload (S3/MinIO) will be integrated.
- Make sure all queries are tenant-scoped (never leak cross-tenant data).

Write TypeScript types and keep controllers thin by delegating logic to services.

---

### 1.5. API cho Sign Requests & Signers

**Prompt:**

Implement the Sign Request and Signer modules according to `docs/api-spec.md` and `docs/blueprint_e_signature_saas.md`.

Endpoints:

- `POST /api/v1/sign-requests`
- `GET /api/v1/sign-requests/:id`
- `POST /api/v1/sign-requests/:id/cancel`
- `POST /api/v1/signers`
- `POST /api/v1/signers/:id/send-otp`
- `POST /api/v1/signers/:id/sign`

Logic:

- On create sign request, persist row in `sign_requests` and initial signers in `signers` table.
- Implement basic status transitions: `draft -> sent -> in_progress -> completed/declined`.
- Implement OTP sending as a placeholder function that:
  - generates a numeric OTP
  - stores it + expiry in DB
  - logs the OTP instead of actually sending email/SMS (add TODO comments for real integration).
- Implement signing:
  - validate OTP
  - mark signer as signed
  - update sign request status when all required signers have signed.

---

### 1.6. Audit Logs & QR

**Prompt:**

Implement the audit log system and QR verification backbone:

1. Create a reusable AuditLog service to record events listed in `docs/blueprint_e_signature_saas.md`.
2. Hook audit logging into:
   - document upload
   - sign request creation
   - signer viewing & signing
3. Implement the backbone for QR-based verification:
   - create a function that computes a stable hash for a signed document (placeholder)
   - create a route `GET /api/v1/verify/:hash` which:
     - looks up a document by hash
     - returns a minimal verification payload (status, signers, timestamps)

Do not implement real PDF hashing or QR image generation yet; add TODO markers.

---

## 2. Frontend – Next.js UI

### 2.1. Cấu trúc dashboard cơ bản

**Prompt:**

In the `frontend/` app, build a basic dashboard layout:

- Sidebar with navigation:
  - Dashboard
  - Documents
  - Sign Requests
  - Settings
- Top bar with tenant name and user menu.
- Main content area for pages.

Use simple styling (CSS or minimal utility classes). No complex design needed yet.

---

### 2.2. Trang Documents

**Prompt:**

Implement the Documents page:

- Fetch document list from `GET /api/v1/documents`.
- Display in a table:
  - Name
  - Owner
  - Status
  - Created At
- Add a button “New Document” which opens a simple form/modal:
  - For now, only allow entering document name and description; call `POST /api/v1/documents` with metadata.
- Implement navigation to a Document detail page showing basic information.

No real file upload yet; add TODO markers for integrating file upload and PDF preview.

---

### 2.3. Trang Sign Requests & Flow ký

**Prompt:**

Implement the Sign Requests UI:

1. List view:
   - Use `GET /api/v1/sign-requests` (you may need to extend the backend).
   - Show status, title, related document, created date.

2. Create view:
   - Select existing document.
   - Add one or more signers (name, email, role).
   - Choose workflow type (sequential/parallel).
   - Submit to `POST /api/v1/sign-requests`.

3. Signer view (for internal user simulation):
   - Show sign request details.
   - Show placeholder PDF frame.
   - Show “Sign” button triggering `POST /api/v1/signers/:id/sign` with mock data.

Keep UI minimal but functional, following the flows in `docs/blueprint_e_signature_saas.md`.

---

## 3. License Server – On-Prem Activation

### 3.1. Hoàn thiện Activation API

**Prompt:**

In `license-server/`, extend the current placeholder to a more realistic activation flow:

- Use an in-memory or file-based store for now (later can be replaced with DB).
- Validate incoming `license_key` and `server_id` against:
  - a small hard-coded list of valid keys
  - expiry dates
- Respond with:
  - `status` (active/expired/invalid)
  - `expire_date`
  - `allowed_users`
  - `allowed_docs`
  - optional `features` list

Ensure the code is clean, strongly typed, and easy to upgrade later.

---

### 3.2. Sinh file license offline (mô phỏng)

**Prompt:**

Still in `license-server/`, add an endpoint to simulate offline license file generation:

- `POST /api/v1/generate-offline-license`
- Accept:
  - `license_key`
  - `hardware_id`
  - `expire_date`
  - `allowed_users`
  - `allowed_docs`
- Return:
  - a signed payload string (e.g., JWT or base64-encoded JSON) that can be used as the content of a `.lic` file.

Use a symmetric secret from environment variables for signing. Explain in comments where to plug in real key management.

---

## 4. DevOps – Docker & Local Dev

### 4.1. Chạy full stack bằng docker-compose

**Prompt:**

Review `docker-compose.yml` at the root. Ensure the following:

- `backend` connects to `db` using the `DATABASE_URL` env var.
- `frontend` can call the backend at `http://backend:4000` from inside the Docker network (and via `http://localhost:4000` from the host).
- `license-server` is reachable at `http://localhost:5000`.

Update Dockerfiles for `backend/`, `frontend/`, and `license-server/` to:

- use a Node LTS image
- install dependencies
- run dev or prod commands accordingly

Make sure `docker-compose up` can bring up a working dev environment without manual tweaks.

---

## 5. Refactor & Quality

### 5.1. Dọn code & chuẩn hoá

**Prompt:**

Perform a cleanup pass on the entire repo:

- Ensure consistent import style and formatting.
- Extract common types/interfaces into shared files.
- Add clear TODO markers where deeper business logic should go later (PDF signing, QR generation, real OTP, storage integration).
- Improve error handling and response shapes to be consistent across all APIs.

Summarize the changes you made and any remaining gaps relative to `docs/blueprint_e_signature_saas.md`.

---

## 6. Troubleshooting / Debug Prompts

### 6.1. Khi backend lỗi lung tung

**Prompt:**

Backend is failing with the following errors:  
[PASTE ERROR LOG HERE]

1. Analyze the stack trace.
2. Identify the root cause.
3. Propose and implement a fix.
4. Explain what happened and how to avoid similar bugs in the future.

---

### 6.2. Khi API không khớp với spec

**Prompt:**

Compare the current implementation of the API routes with `docs/api-spec.md`.

1. List all discrepancies (missing endpoints, wrong parameters, wrong status codes).
2. Fix the implementations to strictly match the spec.
3. Add or update any missing request/response typings.

Provide a short summary of what was changed.

---

## 7. Ghi chú cho AI (Cursor / Coding Assistant)

**Prompt (meta):**

For any future task in this repo:

- Always read relevant sections from `docs/` first.
- Keep multi-tenant behavior and on-prem license constraints in mind.
- When in doubt, choose the simplest implementation that:
  - matches the blueprint
  - is easy to refactor later
  - keeps clear boundaries between modules

Confirm you will follow these conventions for the remainder of this project.

