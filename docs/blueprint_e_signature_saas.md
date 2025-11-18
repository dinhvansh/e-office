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
