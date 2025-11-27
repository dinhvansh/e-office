# Database Schema Overview - E-Office System

## 📊 Tổng quan

**Database**: PostgreSQL  
**ORM**: Prisma  
**Total Tables**: 20 tables  
**Architecture**: Multi-tenant with RBAC

---

## 🏢 Core Tables (5)

### 1. tenants
**Mục đích**: Multi-tenant isolation  
**Fields chính**:
- `id`, `name`, `domain`
- `plan` (free/pro/enterprise)
- `status` (active/suspended)

### 2. users
**Mục đích**: User accounts  
**Fields chính**:
- `email`, `password_hash`, `full_name`
- `department_id`, `manager_id`, `position_id`
- `status` (active/inactive)

### 3. departments
**Mục đích**: Organizational structure  
**Fields chính**:
- `name`, `code`, `parent_id` (tree structure)
- `manager_id`, `level`

### 4. positions
**Mục đích**: Job titles/positions  
**Fields chính**:
- `name`, `code`, `level`
- `description`

### 5. external_organizations
**Mục đích**: External partners/clients  
**Fields chính**:
- `name`, `code`, `tax_code`
- `contact_person`, `contact_email`

---

## 🔐 RBAC Tables (4)

### 6. permissions
**Mục đích**: System permissions  
**Fields chính**:
- `name` (documents:read, approvals:approve)
- `resource`, `action`

### 7. roles
**Mục đích**: User roles  
**Fields chính**:
- `name` (Admin, Manager, User, Viewer)
- `is_system` (cannot delete)

### 8. role_permissions
**Mục đích**: Many-to-many (roles ↔ permissions)

### 9. user_roles
**Mục đích**: Many-to-many (users ↔ roles)

---

## 📄 Document Management (6)

### 10. document_types
**Mục đích**: Document categories  
**Fields chính**:
- `name`, `code` (CV_DEN, HOP_DONG)
- `require_approval`, `default_workflow_id`
- `require_digital_signing` ✍️

### 11. numbering_rules
**Mục đích**: Auto-generate document numbers  
**Fields chính**:
- `pattern` ({AUTO}/{YEAR}/{DEPT})
- `current_number`, `reset_yearly`

### 12. documents
**Mục đích**: Main document storage  
**Fields chính**:
- `title`, `document_number`, `file_path`
- `document_type_id`, `owner_id`
- `status` (draft/active/completed)
- `confidential_level`, `visibility_scope`
- `sign_request_id` (link to signing)

### 13. document_cc_emails
**Mục đích**: CC recipients for documents  
**Fields**: `email`

### 14. document_attachments
**Mục đích**: Document attachments  
**Fields**: `file_path`, `file_name`, `file_size`

### 15. document_tags
**Mục đích**: Document tagging (future)

---

## 🔄 Workflow & Approval (4)

### 16. workflows
**Mục đích**: Approval workflow templates  
**Fields chính**:
- `name`, `description`
- `document_type_id` (optional)

### 17. workflow_steps
**Mục đích**: Steps in workflow  
**Fields chính**:
- `workflow_id`, `step_order`
- `approver_type` (user/role/department/manager)
- `approver_id`

### 18. workflow_instances
**Mục đích**: Active workflow execution  
**Fields chính**:
- `workflow_id`, `document_id`
- `current_step_id`, `status`

### 19. document_approvals
**Mục đích**: Approval records  
**Fields chính**:
- `document_id`, `workflow_instance_id`
- `step_id`, `approver_id`
- `action` (approved/rejected/info_requested)
- `comment`, `signature_data` ✍️

---

## ✍️ Digital Signature (3)

### 20. sign_requests
**Mục đích**: Signing requests  
**Fields chính**:
- `document_id`, `title`, `message`
- `workflow_type` (sequential/parallel)
- `status` (draft/pending/in_progress/completed)
- `deadline`

### 21. signers
**Mục đích**: People who need to sign  
**Fields chính**:
- `sign_request_id`, `email`, `name`
- `signing_order` 🔢 (for sequential)
- `status` (pending/otp_sent/signed/completed)
- `signing_token` (unique URL)
- `otp`, `otp_expire`
- `signature_data`, `signature_type` ✍️
- `signed_at`, `ip_address`, `user_agent`

### 22. sign_request_fields
**Mục đích**: Signature field positions on PDF  
**Fields chính**:
- `sign_request_id`, `document_id`
- `type` (signature/text/date/checkbox)
- `label`, `page`
- `x`, `y`, `width`, `height` (percentage 0-100%)
- `assigned_signer_id` (which signer)
- `required`

### 23. sign_request_field_values
**Mục đích**: Signed values for fields  
**Fields chính**:
- `field_id`, `signer_id`
- `value` (signature data or text)

---

## 🔗 Key Relationships

### Multi-tenant
```
tenants (1) → (N) users
tenants (1) → (N) documents
tenants (1) → (N) workflows
```

### Organization
```
departments (1) → (N) users
departments (1) → (N) departments (tree)
positions (1) → (N) users
users (1) → (N) users (manager)
```

### RBAC
```
users (N) ↔ (N) roles (via user_roles)
roles (N) ↔ (N) permissions (via role_permissions)
```

### Documents
```
documents (1) → (1) document_types
documents (1) → (N) document_cc_emails
documents (1) → (N) document_attachments
documents (1) → (1) sign_requests
documents (1) → (1) workflow_instances
```

### Workflows
```
workflows (1) → (N) workflow_steps
workflows (1) → (N) workflow_instances
workflow_instances (1) → (N) document_approvals
```

### Digital Signature
```
sign_requests (1) → (N) signers
sign_requests (1) → (N) sign_request_fields
signers (1) → (N) sign_request_field_values
sign_request_fields (1) → (N) sign_request_field_values
```

---

## 🎯 Important Fields

### Signing Order Control 🔢
**Table**: `signers`  
**Field**: `signing_order` (Integer, nullable)
- `1, 2, 3...` = Sequential (ký theo thứ tự)
- `1, 1, 1...` = Parallel (ký cùng lúc)
- `null` = No order restriction

### Field Position Format 📐
**Table**: `sign_request_fields`  
**Fields**: `x`, `y`, `width`, `height` (Float)
- **Format**: Percentage (0-100%)
- **Example**: `x: 50.5` = 50.5% from left
- **NOT pixel values!** (đã fix trong session 2025-11-25)

### Signature Data ✍️
**Tables**: `signers`, `document_approvals`  
**Field**: `signature_data` (Text, nullable)
- **Format**: Base64 image string
- **Example**: `data:image/png;base64,iVBORw0KG...`
- **Types**: drawn/uploaded/typed/certificate

---

## 📊 Statistics

### Current Data (After Restore)
- Tenants: 1 (ACME Corporation)
- Users: 7
- Departments: 8
- Positions: 12
- Roles: 5
- Permissions: 40
- Document Types: 6
- External Orgs: 8
- Workflows: 0 (need to restore)
- Documents: 0 (need to restore)

### Schema Version
- Prisma: 5.22.0
- PostgreSQL: 16
- Last Migration: 2025-11-25

---

## 🔧 Maintenance Commands

### View Schema
```bash
cd backend
npx prisma studio  # Visual DB browser
```

### Sync Schema
```bash
npx prisma db push  # Push schema changes
npx prisma generate  # Generate Prisma Client
```

### Migrations
```bash
npx prisma migrate dev --name add_new_field
npx prisma migrate deploy  # Production
```

### Backup/Restore
```bash
node scripts/backup-database.js
node scripts/restore-database-smart.js <filename>
```

---

## ⚠️ Important Notes

### Multi-tenant Isolation
**ALWAYS filter by `tenant_id`** in queries:
```typescript
where: { 
  tenant_id: user.tenant_id,
  // ... other conditions
}
```

### Field Format (CRITICAL!)
**ALWAYS use percentage (0-100%)** for field positions:
```typescript
// ✅ Correct
{ x: 50.5, y: 75.2, width: 25.0, height: 10.0 }

// ❌ Wrong (pixel values)
{ x: 500, y: 750, width: 250, height: 100 }
```

### Signing Order
**Sequential**: `signing_order` must be unique and sequential (1, 2, 3...)  
**Parallel**: All signers have same `signing_order` (1, 1, 1...)

---

## 📚 Related Documentation

- `ERD.md` - Full entity relationship diagram
- `FUNCTIONAL_SPEC.md` - Functional requirements
- `backend/prisma/schema.prisma` - Full schema definition
- `docs/setup-and-backup/README.md` - Setup guide

---

**Last Updated**: 2025-11-24 Evening  
**Schema Version**: v2.5 (with signing order control)
