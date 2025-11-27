# 📋 Phase 1: Foundation Enhancement - Detailed Plan

**Duration**: 2 weeks
**Goal**: Extend current E-Signature system to support E-Office document types and numbering

---

## Week 1: Database Schema & Document Types

### Day 1-2: Schema Design & Migration

#### Task 1.1: Update Prisma Schema
**File**: `backend/prisma/schema.prisma`

Add new models:
```prisma
model document_types {
  id                      Int       @id @default(autoincrement())
  tenant_id               Int
  code                    String    // e.g., "CV", "HD", "QD"
  name                    String    // e.g., "Công văn", "Hợp đồng"
  description             String?
  require_numbering       Boolean   @default(true)
  require_digital_signing Boolean   @default(false)
  category                String?   // incoming/outgoing/internal
  is_active               Boolean   @default(true)
  created_at              DateTime  @default(now())
  
  tenant                  tenants   @relation(fields: [tenant_id], references: [id])
  documents               documents[]
  numbering_rules         numbering_rules[]
  workflows               workflows[]
  
  @@unique([tenant_id, code])
}

model numbering_rules {
  id                Int       @id @default(autoincrement())
  tenant_id         Int
  document_type_id  Int
  pattern           String    // e.g., "{AUTO}/{DEPT}/{YEAR}"
  reset_yearly      Boolean   @default(true)
  last_number       Int       @default(0)
  last_reset_year   Int?
  is_active         Boolean   @default(true)
  created_at        DateTime  @default(now())
  
  tenant            tenants   @relation(fields: [tenant_id], references: [id])
  document_type     document_types @relation(fields: [document_type_id], references: [id])
  
  @@unique([tenant_id, document_type_id])
}

model external_organizations {
  id          Int       @id @default(autoincrement())
  tenant_id   Int
  name        String
  code        String?
  category    String?   // government/supplier/customer/partner
  address     String?
  phone       String?
  email       String?
  contact_person String?
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  
  tenant      tenants   @relation(fields: [tenant_id], references: [id])
  
  @@unique([tenant_id, code])
}

model document_tags {
  document_id Int
  tag         String
  created_at  DateTime  @default(now())
  
  document    documents @relation(fields: [document_id], references: [id])
  
  @@id([document_id, tag])
}

model document_permissions {
  id          Int       @id @default(autoincrement())
  document_id Int
  subject_type String   // user/role/department
  subject_id  Int
  can_read    Boolean   @default(true)
  can_edit    Boolean   @default(false)
  can_approve Boolean   @default(false)
  can_share   Boolean   @default(false)
  can_delete  Boolean   @default(false)
  granted_by  Int?
  granted_at  DateTime  @default(now())
  
  document    documents @relation(fields: [document_id], references: [id])
  
  @@unique([document_id, subject_type, subject_id])
}
```

Update existing `documents` model:
```prisma
model documents {
  // ... existing fields
  document_type_id  Int?
  document_number   String?
  numbering_rule_id Int?
  priority_level    String?   @default("normal") // low/normal/high/urgent
  confidential_level String?  @default("normal") // normal/confidential/secret
  effective_date    DateTime?
  expiration_date   DateTime?
  issued_date       DateTime?
  summary           String?
  
  document_type     document_types? @relation(fields: [document_type_id], references: [id])
  tags              document_tags[]
  permissions       document_permissions[]
}
```

**Deliverable**: Updated schema file

#### Task 1.2: Create Migration
```bash
npx prisma migrate dev --name add_document_types_and_numbering
```

**Deliverable**: Migration SQL file

#### Task 1.3: Seed Document Types
**File**: `backend/scripts/seed-document-types.js`

Create default document types:
- Công văn đến (Incoming)
- Công văn đi (Outgoing)
- Hợp đồng (Contract)
- Quyết định (Decision)
- Thông báo (Notification)
- Biên bản (Minutes)
- Đề xuất (Proposal)

**Deliverable**: Seed script

---

### Day 3-4: Document Types Module (Backend)

#### Task 1.4: Document Types Repository
**File**: `backend/src/modules/documentTypes/documentTypes.repository.ts`

Methods:
- `findByTenant(tenantId)`
- `findById(id, tenantId)`
- `create(data)`
- `update(id, data)`
- `delete(id)`
- `findByCode(code, tenantId)`

#### Task 1.5: Document Types Service
**File**: `backend/src/modules/documentTypes/documentTypes.service.ts`

Business logic:
- Validate unique code per tenant
- Check if document type is in use before delete
- Handle active/inactive status

#### Task 1.6: Document Types Controller & Routes
**Files**: 
- `backend/src/modules/documentTypes/documentTypes.controller.ts`
- `backend/src/modules/documentTypes/documentTypes.routes.ts`

Endpoints:
- `GET /api/v1/document-types`
- `GET /api/v1/document-types/:id`
- `POST /api/v1/document-types`
- `PUT /api/v1/document-types/:id`
- `DELETE /api/v1/document-types/:id`

**Deliverable**: Complete document types module

---

### Day 5: Numbering Service

#### Task 1.7: Numbering Rules Repository
**File**: `backend/src/modules/numbering/numbering.repository.ts`

#### Task 1.8: Numbering Service
**File**: `backend/src/modules/numbering/numbering.service.ts`

Key method:
```typescript
async generateDocumentNumber(
  tenantId: number,
  documentTypeId: number,
  departmentCode?: string
): Promise<string>
```

Logic:
1. Get numbering rule for document type
2. Parse pattern: `{AUTO}/{DEPT}/{YEAR}`
3. Check if need yearly reset
4. Increment last_number
5. Format and return number
6. Update last_number in DB (transaction)

**Deliverable**: Numbering service with tests

---

## Week 2: Frontend UI & Integration

### Day 6-7: Document Types UI

#### Task 1.9: Document Types List Page
**File**: `frontend/app/(dashboard)/document-types/page.tsx`

Features:
- List all document types
- Filter by category
- Search by name/code
- Create/Edit/Delete actions
- Active/Inactive toggle

#### Task 1.10: Document Type Form Modal
**Component**: `frontend/components/DocumentTypeForm.tsx`

Fields:
- Code (required, unique)
- Name (required)
- Description
- Category (dropdown)
- Require Numbering (checkbox)
- Require Digital Signing (checkbox)

**Deliverable**: Document types management UI

---

### Day 8-9: Numbering Rules UI

#### Task 1.11: Numbering Rules Page
**File**: `frontend/app/(dashboard)/document-types/[id]/numbering.tsx`

Features:
- Configure numbering pattern
- Pattern builder with tokens:
  - {AUTO} - Auto increment
  - {DEPT} - Department code
  - {YEAR} - Current year
  - {MONTH} - Current month
- Preview generated numbers
- Reset yearly option

**Deliverable**: Numbering configuration UI

---

### Day 10: Integration & Testing

#### Task 1.12: Update Document Upload
**File**: `frontend/app/(dashboard)/documents/page.tsx`

Add fields:
- Document Type (dropdown)
- Priority Level
- Confidential Level
- Tags (multi-select)
- Summary (textarea)

#### Task 1.13: Auto-numbering Integration
When document is created:
1. Select document type
2. If require_numbering = true
3. Auto-generate document number
4. Display in document detail

#### Task 1.14: Update Documents List
Show:
- Document type badge
- Document number
- Priority indicator
- Confidential level icon

**Deliverable**: Updated document management with types

---

## Testing Checklist

- [ ] Create document type
- [ ] Update document type
- [ ] Delete unused document type
- [ ] Cannot delete document type in use
- [ ] Configure numbering rule
- [ ] Generate document number
- [ ] Yearly reset works correctly
- [ ] Upload document with type
- [ ] Auto-numbering on document creation
- [ ] Filter documents by type
- [ ] Search documents by number

---

## Success Criteria

1. ✅ All new tables created and seeded
2. ✅ Document types CRUD working
3. ✅ Numbering service generates correct numbers
4. ✅ UI for document types management
5. ✅ Documents can be assigned types
6. ✅ Auto-numbering works on document creation
7. ✅ All tests passing
8. ✅ No breaking changes to existing features

---

## Files to Create/Modify

### Backend (New)
- `backend/src/modules/documentTypes/` (4 files)
- `backend/src/modules/numbering/` (3 files)
- `backend/scripts/seed-document-types.js`

### Backend (Modified)
- `backend/prisma/schema.prisma`
- `backend/src/router/v1.ts`
- `backend/src/modules/documents/documents.service.ts`

### Frontend (New)
- `frontend/app/(dashboard)/document-types/page.tsx`
- `frontend/components/DocumentTypeForm.tsx`

### Frontend (Modified)
- `frontend/app/(dashboard)/documents/page.tsx`
- `frontend/app/(dashboard)/layout.tsx` (add menu)

---

**Ready to start Phase 1? Let me know!** 🚀
