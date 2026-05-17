# Implementation Plan: E-Sign Fields Editor

**Status**: Ready to Implement  
**Estimated Total Time**: 4.5 hours  
**Priority**: High  
**Dependencies**: Existing sign_requests module

---

## 📋 Overview

Implement a complete E-Sign fields editor system with:
1. Database schema for sign fields
2. Backend APIs for field management
3. Frontend editor UI (drag & drop)
4. Public signing page for signers

---

## 🗓️ Phase 1: Database Schema (15 mins)

### Step 1.1: Add Prisma Models (10 mins)
**File**: `backend/prisma/schema.prisma`

Add two new models:

```prisma
model sign_request_fields {
  id                Int       @id @default(autoincrement())
  sign_request_id   Int
  document_id       Int
  assigned_signer_id Int?

  type              String    // 'signature' | 'text' | 'date' | 'checkbox'
  page              Int
  x                 Float
  y                 Float
  width             Float?
  height            Float?

  required          Boolean   @default(true)
  label             String?
  placeholder       String?
  read_only         Boolean   @default(false)

  created_at        DateTime  @default(now())

  sign_request      sign_requests @relation(fields: [sign_request_id], references: [id], onDelete: Cascade)
  document          documents      @relation(fields: [document_id], references: [id], onDelete: Cascade)
  assigned_signer   signers?       @relation(fields: [assigned_signer_id], references: [id], onDelete: SetNull)
  values            sign_request_field_values[]

  @@index([sign_request_id])
  @@index([document_id])
}

model sign_request_field_values {
  id           Int       @id @default(autoincrement())
  field_id     Int
  signer_id    Int
  value        Json
  filled_at    DateTime  @default(now())

  field        sign_request_fields @relation(fields: [field_id], references: [id], onDelete: Cascade)
  signer       signers            @relation(fields: [signer_id], references: [id], onDelete: Cascade)

  @@index([field_id])
  @@index([signer_id])
}
```

**Checklist**:
- [ ] Add models to schema.prisma
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Verify tables created in database

### Step 1.2: Add signing_token to signers (5 mins)

```prisma
model signers {
  // ... existing fields
  signing_token     String?   @unique
  // ... rest
}
```

**Checklist**:
- [ ] Add signing_token field
- [ ] Run prisma generate + db push
- [ ] Verify column added

---

## 🗓️ Phase 2: Backend - Field Management APIs (1.5 hours)

### Step 2.1: Create Repository (20 mins)
**File**: `backend/src/modules/signRequests/signRequestFields.repository.ts`

```typescript
export class SignRequestFieldsRepository {
  async findBySignRequest(signRequestId: number): Promise<sign_request_fields[]>
  async findById(fieldId: number): Promise<sign_request_fields | null>
  async create(data: CreateFieldData): Promise<sign_request_fields>
  async update(fieldId: number, data: UpdateFieldData): Promise<sign_request_fields>
  async delete(fieldId: number): Promise<void>
  async bulkUpsert(signRequestId: number, fields: FieldData[]): Promise<void>
}
```

**Checklist**:
- [ ] Create repository file
- [ ] Implement all methods
- [ ] Add proper error handling
- [ ] Export repository instance

### Step 2.2: Create Service (30 mins)
**File**: `backend/src/modules/signRequests/signRequestFields.service.ts`

```typescript
export class SignRequestFieldsService {
  async getEditorData(signRequestId: number, tenantId: number, userId: number)
  async saveFields(signRequestId: number, fields: FieldInput[], tenantId: number)
  async deleteField(fieldId: number, tenantId: number)
  async validateFieldsBeforeSend(signRequestId: number): Promise<ValidationResult>
}
```

**Business Logic**:
- Only allow editing when status = 'draft'
- Validate all required fields have assigned_signer_id
- Check tenant isolation
- Check user permissions (owner or admin)

**Checklist**:
- [ ] Create service file
- [ ] Implement getEditorData
- [ ] Implement saveFields (bulk upsert)
- [ ] Implement deleteField
- [ ] Implement validateFieldsBeforeSend
- [ ] Add proper error messages

### Step 2.3: Update Controller (20 mins)
**File**: `backend/src/modules/signRequests/signRequests.controller.ts`

Add new endpoints:

```typescript
getEditor = async (req: Request, res: Response) => {
  // GET /api/v1/sign-requests/:id/editor
}

saveFields = async (req: Request, res: Response) => {
  // POST /api/v1/sign-requests/:id/fields
}

deleteField = async (req: Request, res: Response) => {
  // DELETE /api/v1/sign-requests/:id/fields/:fieldId
}
```

**Checklist**:
- [ ] Add getEditor method
- [ ] Add saveFields method
- [ ] Add deleteField method
- [ ] Add Zod validation schemas
- [ ] Add proper error handling

### Step 2.4: Update Routes (10 mins)
**File**: `backend/src/modules/signRequests/signRequests.routes.ts`

```typescript
router.get('/:id/editor', requirePermission('sign_requests', 'update'), asyncHandler(controller.getEditor));
router.post('/:id/fields', requirePermission('sign_requests', 'update'), asyncHandler(controller.saveFields));
router.delete('/:id/fields/:fieldId', requirePermission('sign_requests', 'update'), asyncHandler(controller.deleteField));
```

**Checklist**:
- [ ] Add editor route
- [ ] Add fields routes
- [ ] Add permission middleware
- [ ] Test routes with Postman/REST Client

### Step 2.5: Update Send Logic (10 mins)
**File**: `backend/src/modules/signRequests/signRequests.service.ts`

Update `sendSignRequest()` method:

```typescript
async sendSignRequest(signRequestId: number, tenantId: number) {
  // 1. Validate fields
  const validation = await signRequestFieldsService.validateFieldsBeforeSend(signRequestId);
  if (!validation.valid) {
    throw ApiError.badRequest(validation.message);
  }
  
  // 2. Generate signing_token for each signer
  for (const signer of signers) {
    const token = crypto.randomBytes(32).toString('hex');
    await signersRepository.update(signer.id, { signing_token: token });
  }
  
  // 3. Existing send logic...
}
```

**Checklist**:
- [ ] Add field validation before send
- [ ] Generate signing_token for signers
- [ ] Update email template with signing link
- [ ] Test send flow

---

## 🗓️ Phase 3: Backend - Public Signing APIs (1 hour)

### Step 3.1: Create Public Controller (30 mins)
**File**: `backend/src/modules/public/publicSign.controller.ts`

```typescript
export class PublicSignController {
  getSigningPage = async (req: Request, res: Response) => {
    // GET /public/sign/:token
  }
  
  getDocument = async (req: Request, res: Response) => {
    // GET /public/sign/:token/document
  }
  
  sendOtp = async (req: Request, res: Response) => {
    // POST /public/sign/:token/send-otp
  }
  
  submitSignature = async (req: Request, res: Response) => {
    // POST /public/sign/:token/sign
  }
}
```

**Checklist**:
- [ ] Create controller file
- [ ] Implement getSigningPage
- [ ] Implement getDocument (stream PDF)
- [ ] Implement sendOtp (reuse existing)
- [ ] Implement submitSignature
- [ ] Add token validation middleware

### Step 3.2: Create Public Routes (10 mins)
**File**: `backend/src/modules/public/publicSign.routes.ts`

```typescript
const router = Router();
router.get('/:token', asyncHandler(controller.getSigningPage));
router.get('/:token/document', asyncHandler(controller.getDocument));
router.post('/:token/send-otp', asyncHandler(controller.sendOtp));
router.post('/:token/sign', asyncHandler(controller.submitSignature));
```

**Checklist**:
- [ ] Create routes file
- [ ] Add to main router
- [ ] Test public access (no auth required)

### Step 3.3: Create Field Values Service (20 mins)
**File**: `backend/src/modules/signRequests/signRequestFieldValues.service.ts`

```typescript
export class SignRequestFieldValuesService {
  async saveFieldValues(signerId: number, fieldValues: FieldValueInput[])
  async getFieldValues(signerId: number): Promise<FieldValue[]>
  async validateRequiredFields(signerId: number): Promise<boolean>
}
```

**Checklist**:
- [ ] Create service file
- [ ] Implement saveFieldValues (upsert)
- [ ] Implement getFieldValues
- [ ] Implement validation
- [ ] Handle JSON value storage

---

## 🗓️ Phase 4: Frontend - Editor UI (1.5 hours)

### Step 4.1: Create Editor Page (30 mins)
**File**: `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx`

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Header: Sign Request Title + Actions       │
├──────────┬──────────────────────┬───────────┤
│ Signers  │   PDF Viewer         │  Fields   │
│ List     │   (with overlays)    │  Palette  │
│ (Left)   │   (Center)           │  (Right)  │
│          │                      │           │
│ - Signer1│   [PDF Content]      │ 🖊️ Signature│
│ - Signer2│   [Field Overlays]   │ 📝 Text    │
│ - Signer3│                      │ 📅 Date    │
│          │                      │ ☑️ Checkbox│
└──────────┴──────────────────────┴───────────┘
```

**Checklist**:
- [ ] Create page file
- [ ] Fetch editor data (sign_request, document, signers, fields)
- [ ] Create 3-column layout
- [ ] Add loading states
- [ ] Add error handling

### Step 4.2: Create Signers Sidebar (15 mins)
**Component**: `frontend/components/sign-editor/SignersList.tsx`

**Features**:
- List all signers
- Highlight selected signer
- Show signer avatar, name, role
- Click to select active signer

**Checklist**:
- [ ] Create component
- [ ] Add signer selection state
- [ ] Style with Tailwind
- [ ] Add hover effects

### Step 4.3: Create PDF Viewer (20 mins)
**Component**: `frontend/components/sign-editor/PdfViewer.tsx`

**Options**:
1. Use `react-pdf` library
2. Use `<iframe>` with PDF.js
3. Use `<object>` tag

**Checklist**:
- [ ] Install PDF library (if needed)
- [ ] Create viewer component
- [ ] Load PDF from API
- [ ] Add zoom controls
- [ ] Add page navigation

### Step 4.4: Create Field Overlays (25 mins)
**Component**: `frontend/components/sign-editor/FieldOverlay.tsx`

**Features**:
- Render field boxes on PDF
- Drag to reposition
- Resize handles
- Click to edit properties
- Delete button

**Checklist**:
- [ ] Create overlay component
- [ ] Implement drag & drop (use react-dnd or custom)
- [ ] Implement resize
- [ ] Add field styling by type
- [ ] Add delete confirmation

### Step 4.5: Create Fields Palette (20 mins)
**Component**: `frontend/components/sign-editor/FieldsPalette.tsx`

**Fields**:
- 🖊️ Signature
- 📝 Text
- 📅 Date
- ☑️ Checkbox

**Checklist**:
- [ ] Create palette component
- [ ] Add field type buttons
- [ ] Implement drag from palette
- [ ] Add field to PDF on drop
- [ ] Assign to selected signer

### Step 4.6: Add Save & Send Actions (10 mins)

**Buttons**:
- "Save Draft" - Save fields without sending
- "Send for Signing" - Validate + send

**Checklist**:
- [ ] Add action buttons
- [ ] Implement save mutation
- [ ] Implement send mutation
- [ ] Add validation feedback
- [ ] Add success/error toasts

---

## 🗓️ Phase 5: Frontend - Public Signing Page (1 hour)

### Step 5.1: Create Public Layout (10 mins)
**File**: `frontend/app/sign/[token]/layout.tsx`

Simple layout without dashboard chrome.

**Checklist**:
- [ ] Create layout file
- [ ] Add minimal header
- [ ] Add footer
- [ ] Style for public access

### Step 5.2: Create Signing Page (30 mins)
**File**: `frontend/app/sign/[token]/page.tsx`

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Header: Document Title                     │
├──────────┬──────────────────────────────────┤
│ Fields   │   PDF Viewer                     │
│ Checklist│   (with field highlights)        │
│ (Left)   │   (Center)                       │
│          │                                  │
│ ☐ Field 1│   [PDF Content]                  │
│ ☑ Field 2│   [Highlighted Fields]           │
│ ☐ Field 3│                                  │
│          │                                  │
│ [Complete]│                                  │
└──────────┴──────────────────────────────────┘
```

**Checklist**:
- [ ] Create page file
- [ ] Fetch signing data by token
- [ ] Show document info
- [ ] List signer's fields
- [ ] Show PDF viewer
- [ ] Handle completed state

### Step 5.3: Create Field Input Components (20 mins)

**Components**:
- `SignatureInput.tsx` - Canvas for drawing
- `TextInput.tsx` - Text field
- `DateInput.tsx` - Date picker
- `CheckboxInput.tsx` - Checkbox

**Checklist**:
- [ ] Create signature canvas component
- [ ] Create text input component
- [ ] Create date picker component
- [ ] Create checkbox component
- [ ] Add validation

### Step 5.4: Add Submit Flow (10 mins)

**Flow**:
1. Validate all required fields filled
2. Request OTP (if needed)
3. Submit signature with field values
4. Show success message

**Checklist**:
- [ ] Add submit button
- [ ] Implement OTP flow
- [ ] Implement submit mutation
- [ ] Show success state
- [ ] Handle errors

---

## 🗓️ Phase 6: Testing & Polish (30 mins)

### Step 6.1: Backend Testing (15 mins)

**Test Cases**:
1. Create fields for sign request
2. Update field positions
3. Delete field
4. Validate before send
5. Submit signature with field values
6. Verify field values saved

**Checklist**:
- [ ] Create test script or REST Client file
- [ ] Test all CRUD operations
- [ ] Test validation logic
- [ ] Test public signing flow
- [ ] Test error cases

### Step 6.2: Frontend Testing (10 mins)

**Test Cases**:
1. Load editor page
2. Add fields to PDF
3. Drag & resize fields
4. Save draft
5. Send for signing
6. Open signing link
7. Fill & submit fields

**Checklist**:
- [ ] Test editor UI
- [ ] Test drag & drop
- [ ] Test save/send
- [ ] Test public signing page
- [ ] Test mobile responsive

### Step 6.3: Documentation (5 mins)

**Checklist**:
- [ ] Update TASK-ORDER.md status
- [ ] Create session report
- [ ] Update AGENTS.md
- [ ] Add API examples to test-api.http

---

## 📊 Summary

### Time Breakdown
- Phase 1: Database (15 mins)
- Phase 2: Backend APIs (1.5 hours)
- Phase 3: Public APIs (1 hour)
- Phase 4: Editor UI (1.5 hours)
- Phase 5: Signing Page (1 hour)
- Phase 6: Testing (30 mins)

**Total**: ~4.5 hours

### Files to Create/Modify

**Backend** (~12 files):
- `schema.prisma` (modify)
- `signRequestFields.repository.ts` (new)
- `signRequestFields.service.ts` (new)
- `signRequestFieldValues.service.ts` (new)
- `signRequests.controller.ts` (modify)
- `signRequests.service.ts` (modify)
- `signRequests.routes.ts` (modify)
- `publicSign.controller.ts` (new)
- `publicSign.routes.ts` (new)
- `router/v1.ts` (modify)

**Frontend** (~10 files):
- `app/(dashboard)/sign-requests/[id]/editor/page.tsx` (new)
- `app/sign/[token]/layout.tsx` (new)
- `app/sign/[token]/page.tsx` (new)
- `components/sign-editor/SignersList.tsx` (new)
- `components/sign-editor/PdfViewer.tsx` (new)
- `components/sign-editor/FieldOverlay.tsx` (new)
- `components/sign-editor/FieldsPalette.tsx` (new)
- `components/sign-editor/SignatureInput.tsx` (new)
- `components/sign-editor/TextInput.tsx` (new)
- `components/sign-editor/DateInput.tsx` (new)

### Dependencies to Install

**Backend**: None (use existing)

**Frontend**:
- `react-pdf` or `pdfjs-dist` (PDF viewer)
- `react-dnd` (optional, for drag & drop)
- `react-signature-canvas` (signature drawing)

### Success Criteria

- [ ] Can create sign request with fields
- [ ] Can drag & drop fields on PDF
- [ ] Can assign fields to signers
- [ ] Can send for signing
- [ ] Signer receives email with link
- [ ] Signer can fill & sign fields
- [ ] Field values saved to database
- [ ] Sign request status updates correctly

---

## 🔜 Next Steps After This Task

1. **PDF Stamping**: Render field values onto final PDF
2. **Advanced Fields**: Dropdown, radio buttons, initials
3. **Templates**: Save field layouts as templates
4. **Bulk Send**: Send same document to multiple signers
5. **Audit Trail**: Track all field changes

---

## 📝 Notes for Implementation

- Start with Phase 1 (database) - must complete before anything else
- Backend (Phases 2-3) can be done independently of frontend
- Frontend editor (Phase 4) requires backend APIs complete
- Public signing page (Phase 5) requires both backend phases
- Test incrementally after each phase
- Use existing patterns from documents/approvals modules
- Reuse existing components (Button, Dialog, etc.)
- Follow existing code style and structure

**Ready to implement in next session!** 🚀
