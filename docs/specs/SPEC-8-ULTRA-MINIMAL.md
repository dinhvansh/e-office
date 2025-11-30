# SPEC-8: Ultra-Minimal E-Signature (DocuSign-like)

## 📋 Overview
Bản SIÊU ĐƠN GIẢN chỉ focus e-signature, không approval workflow, không phân quyền phức tạp.

**Motto**: "Upload → Add Fields → Send → Sign → Done"

**Priority**: HIGH  
**Estimated Time**: 2 days  
**Impact**: Giảm 80% complexity, dễ dùng nhất có thể

---

## 🎯 Philosophy: Keep It Simple, Stupid (KISS)

Học từ **DocuSign, SignNow, HelloSign**:
- ✅ Ai cũng có thể tạo sign request
- ✅ Không cần setup phức tạp
- ✅ 3 bước: Upload → Assign → Sign
- ❌ Không có approval workflow
- ❌ Không có departments
- ❌ Không có roles (ai cũng như nhau)

---

## 🗑️ Loại Bỏ GẦN HẾT

### Tables BỎ (Giữ 8/20 tables)
```sql
-- ❌ REMOVE: Approval & Workflow
DROP TABLE document_approvals;
DROP TABLE workflow_instances;
DROP TABLE workflow_steps;
DROP TABLE workflows;

-- ❌ REMOVE: RBAC
DROP TABLE role_permissions;
DROP TABLE permissions;
DROP TABLE user_roles;
DROP TABLE roles;

-- ❌ REMOVE: Organization Structure
DROP TABLE departments;
DROP TABLE positions;
DROP TABLE document_types;
DROP TABLE numbering_rules;
DROP TABLE external_organizations;

-- ❌ REMOVE: Advanced Features
DROP TABLE document_permissions;
DROP TABLE document_versions;
DROP TABLE document_tags;
DROP TABLE document_cc_emails;
DROP TABLE document_attachments;

-- ✅ KEEP: Core E-Signature (8 tables)
-- tenants
-- users (simplified)
-- documents (simplified)
-- sign_requests
-- signers
-- sign_request_fields
-- sign_request_field_values
-- audit_logs
```

---

## 📝 Simplified Database Schema

### Core Tables Only

```prisma
// ✅ TENANT (Multi-tenant support)
model tenants {
  id         Int      @id @default(autoincrement())
  name       String
  domain     String   @unique
  created_at DateTime @default(now())
  
  users         users[]
  documents     documents[]
  sign_requests sign_requests[]
}

// ✅ USER (No roles, everyone equal)
model users {
  id            Int      @id @default(autoincrement())
  tenant_id     Int
  email         String   @unique
  password_hash String
  full_name     String
  avatar_url    String?
  status        String   @default("active")
  created_at    DateTime @default(now())
  
  tenant        tenants  @relation(fields: [tenant_id], references: [id])
  documents     documents[]
  signers       signers[]
  
  // ❌ NO: department_id, manager_id, position_id, role
}

// ✅ DOCUMENT (Minimal fields)
model documents {
  id                 Int      @id @default(autoincrement())
  tenant_id          Int
  owner_id           Int
  file_path          String
  original_file_name String
  signed_file_path   String?
  hash               String
  title              String?
  status             String   @default("draft")  // draft, sent, completed
  created_at         DateTime @default(now())
  
  tenant        tenants        @relation(fields: [tenant_id], references: [id])
  owner         users          @relation(fields: [owner_id], references: [id])
  sign_requests sign_requests[]
  audit_logs    audit_logs[]
  
  // ❌ NO: document_type, department, numbering, versions, tags, etc.
}

// ✅ SIGN REQUEST
model sign_requests {
  id          Int      @id @default(autoincrement())
  tenant_id   Int
  document_id Int
  title       String
  message     String?
  status      String   @default("pending")  // pending, completed, cancelled
  deadline    DateTime?
  created_at  DateTime @default(now())
  
  tenant   tenants   @relation(fields: [tenant_id], references: [id])
  document documents @relation(fields: [document_id], references: [id])
  signers  signers[]
  fields   sign_request_fields[]
}

// ✅ SIGNERS
model signers {
  id              Int      @id @default(autoincrement())
  sign_request_id Int
  user_id         Int?     // null = external signer
  email           String
  name            String
  signing_order   Int      @default(1)
  is_internal     Boolean  @default(false)
  status          String   @default("pending")
  otp             String?
  otp_expire      DateTime?
  signed_at       DateTime?
  signature_data  String?
  signing_token   String?  @unique
  ip_address      String?
  
  sign_request sign_requests @relation(fields: [sign_request_id], references: [id])
  user         users?        @relation(fields: [user_id], references: [id])
  field_values sign_request_field_values[]
}

// ✅ SIGNATURE FIELDS
model sign_request_fields {
  id              Int     @id @default(autoincrement())
  sign_request_id Int
  type            String  // signature, text, date, checkbox
  page            Int
  x               Float
  y               Float
  width           Float?
  height          Float?
  required        Boolean @default(true)
  label           String?
  signer_email    String  // Which signer fills this field
  
  sign_request sign_requests @relation(fields: [sign_request_id], references: [id])
  values       sign_request_field_values[]
}

// ✅ FIELD VALUES
model sign_request_field_values {
  id        Int      @id @default(autoincrement())
  field_id  Int
  signer_id Int
  value     Json
  filled_at DateTime @default(now())
  
  field  sign_request_fields @relation(fields: [field_id], references: [id])
  signer signers             @relation(fields: [signer_id], references: [id])
  
  @@unique([field_id, signer_id])
}

// ✅ AUDIT LOGS
model audit_logs {
  id          Int      @id @default(autoincrement())
  document_id Int
  event       String
  user_email  String?  // Email instead of user_id
  ip          String?
  created_at  DateTime @default(now())
  
  document documents @relation(fields: [document_id], references: [id])
}
```

---

## 🎨 User Flow (Super Simple)

### 1. Upload Document
```
User clicks "New Document"
  → Upload PDF file
  → Enter title
  → Click "Next"
```

### 2. Add Signature Fields
```
Drag & drop fields on PDF:
  ✍️ Signature box
  📝 Text field
  📅 Date field
  ☑️ Checkbox

For each field:
  → Assign to signer (by email)
  → Required/Optional
```

### 3. Add Signers
```
Add recipient:
  → Email
  → Name
  → Signing order (1, 2, 3...)

Can add multiple signers
```

### 4. Send
```
Click "Send for Signature"
  → Emails sent to all signers
  → OTP sent (if needed)
```

### 5. Sign (Recipient Side)
```
Signer clicks email link
  → Enter OTP
  → View document
  → Fill assigned fields
  → Add signature (draw/upload)
  → Click "Sign"
  → Done!
```

### 6. Download Signed PDF
```
When all signed:
  → Document status = "Completed"
  → Download signed PDF with audit trail
```

---

## 🖼️ UI Mockup

### Main Dashboard
```
┌─────────────────────────────────────────┐
│ 📄 E-Signature                          │
├─────────────────────────────────────────┤
│                                         │
│  [➕ New Document]    [📥 Inbox (3)]    │
│                                         │
│  Recent Documents                       │
│  ┌──────────────────────────────────┐  │
│  │ Contract.pdf                     │  │
│  │ 👤 2/3 signed  🕐 Due tomorrow   │  │
│  │ [View] [Remind]                  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ NDA.pdf                          │  │
│  │ ✅ Completed                     │  │
│  │ [Download]                       │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Signature Editor (DocuSign-style)
```
┌─────────────────────────────────────────┐
│ 📝 Prepare Document                     │
├─────────────────────────────────────────┤
│                                         │
│  Signers:                               │
│  1️⃣ john@example.com                   │
│  2️⃣ jane@example.com                   │
│  [+ Add Signer]                         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Drag fields here:               │   │
│  │                                 │   │
│  │  ✍️ Signature                   │   │
│  │  📝 Text                        │   │
│  │  📅 Date                        │   │
│  │  ☑️ Checkbox                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [← Back]              [Send →]        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📝 API Endpoints (Minimal)

### Documents
```
POST   /api/documents              # Upload
GET    /api/documents              # List mine
GET    /api/documents/:id          # View one
DELETE /api/documents/:id          # Delete draft
```

### Sign Requests
```
POST   /api/sign-requests          # Create & send
GET    /api/sign-requests          # List mine
GET    /api/sign-requests/:id      # View details
POST   /api/sign-requests/:id/send # Resend emails
DELETE /api/sign-requests/:id      # Cancel
```

### Signing (External/Internal)
```
GET    /api/sign/:token            # Load signing page
POST   /api/sign/:token/otp        # Request OTP
POST   /api/sign/:token/verify     # Verify OTP
POST   /api/sign/:token/submit     # Submit signature
```

### Fields
```
POST   /api/sign-requests/:id/fields     # Add field
PUT    /api/sign-requests/:id/fields/:fid # Update
DELETE /api/sign-requests/:id/fields/:fid # Delete
```

---

## 🎯 Core Features ONLY

### ✅ What's Included
- Multi-tenant (separate workspaces)
- Upload PDF documents
- Drag-drop signature fields
- Sequential signing (order)
- Email notifications
- OTP verification (external signers)
- Internal signing (logged-in users)
- Download signed PDF with audit trail
- Basic document list/search

### ❌ What's REMOVED
- Approval workflows
- Departments & org structure
- Roles & permissions
- Document types & numbering
- Document versions
- Tags & metadata
- Advanced search
- Reports & analytics
- Webhooks (optional, can add later)

---

## 🚀 Implementation Plan

### Phase 1: Database Migration (4 hours)
```sql
-- Drop all complex tables
-- Keep only 8 core tables
-- Migrate existing data if needed
```

### Phase 2: Backend Simplification (1 day)
```
Remove modules:
  ❌ approvals/
  ❌ workflows/
  ❌ departments/
  ❌ positions/
  ❌ roles/
  ❌ permissions/
  ❌ documentTypes/
  ❌ numbering/
  ❌ external-orgs/

Keep modules:
  ✅ auth/
  ✅ users/
  ✅ documents/
  ✅ signRequests/
  ✅ signers/
  ✅ audit/

Simplify:
  - No permission checks
  - No workflow logic
  - Simple email sending
```

### Phase 3: Frontend Rebuild (1 day)
```
Pages needed:
  ✅ /login
  ✅ /dashboard (document list)
  ✅ /documents/new (upload)
  ✅ /documents/:id/prepare (field editor)
  ✅ /sign/:token (signing page)
  
Pages removed:
  ❌ /workflows
  ❌ /approvals
  ❌ /departments
  ❌ /roles
  ❌ /document-types
  (Everything else)
```

---

## 📊 Comparison

| Feature | Current E-Office | Ultra-Minimal |
|---------|-----------------|---------------|
| **Tables** | 20+ | **8** |
| **Modules** | 20 | **6** |
| **User Types** | 5+ roles | **1 (all equal)** |
| **Setup Time** | 2 hours | **5 minutes** |
| **Learning Curve** | 2 days | **10 minutes** |
| **Use Case** | Enterprise workflows | **Quick signatures** |
| **Pricing** | $19/user | **$5/user** |

---

## 💰 Pricing Strategy

**E-Signature Lite**:
- $5/user/month
- Unlimited documents
- Unlimited signatures
- Email support

**vs DocuSign**:
- DocuSign: $10-25/user/month
- HelloSign: $15/user/month
- SignNow: $8/user/month
→ **Competitive pricing** ✅

---

## 🎯 Target Market

### Perfect For:
- ✅ Freelancers (NDAs, contracts)
- ✅ Small teams (<10 people)
- ✅ HR (offer letters)
- ✅ Sales (proposals)
- ✅ Real estate (agreements)

### NOT For:
- ❌ Large enterprises (need approvals)
- ❌ Complex workflows
- ❌ Multi-level approvals
- → Use full E-Office instead

---

## 🚀 Quick Start

### New User Onboarding
```
1. Sign up (email + password)
2. Upload first document
3. Add signature field
4. Enter signer email
5. Send!

Total time: 2 minutes
```

### No Configuration Needed
- ❌ No roles to assign
- ❌ No departments to create
- ❌ No workflows to build
- ✅ Just upload and sign!

---

## 📱 Future Enhancements (Optional)

### Nice to Have:
- Mobile app (sign on phone)
- Templates (save common documents)
- Bulk send (same doc to many)
- In-person signing (tablet mode)
- Advanced fields (formula, conditional)
- Branding (custom logo, colors)

Keep it **OPTIONAL** - don't complicate core!

---

## 🎯 Success Metrics

- **Setup to First Send**: < 5 minutes
- **User Training**: < 10 minutes
- **Completion Rate**: > 85%
- **User Satisfaction**: > 4.5/5

---

## 📝 Deliverables

- [ ] Simplified database schema (8 tables)
- [ ] Migration script
- [ ] Backend API (6 modules only)
- [ ] Clean frontend (5 pages)
- [ ] Docker deployment
- [ ] User documentation (1 page)
- [ ] Video tutorial (3 minutes)

---

## 💡 Key Principle

**"If in doubt, leave it out!"**

Every feature must answer: **"Is this ESSENTIAL for signing a document?"**
- If NO → Remove it
- If YES → Keep it simple

**Total Complexity**: ⭐ (vs ⭐⭐⭐⭐⭐ full version)
