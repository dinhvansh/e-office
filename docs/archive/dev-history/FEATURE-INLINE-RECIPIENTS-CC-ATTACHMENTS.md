# Feature: Inline Recipients, CC & Attachments in Upload Form

**Date**: 2025-11-23  
**Status**: 📋 Planning  
**Estimated Time**: 3-4 hours

## 🎯 Goal

Thêm trực tiếp vào form upload (không cần dialog riêng):
1. **Người ký** - Chọn thủ công hoặc từ tổ chức bên ngoài
2. **CC Email** - Người nhận bản sao
3. **Đính kèm** - File đính kèm bổ sung

## 📋 Requirements

### 1. Người Ký Section
```
┌─────────────────────────────────────────────┐
│ 👥 Người ký (Signers)                       │
├─────────────────────────────────────────────┤
│ [➕ Thêm người ký]                          │
│                                             │
│ ┌─ Người ký #1 ─────────────────────────┐  │
│ │ Loại: [👤 Thủ công] [🏢 Tổ chức]     │  │
│ │                                        │  │
│ │ Email: [________________]             │  │
│ │ Họ tên: [________________]            │  │
│ │ Thứ tự: [1]                           │  │
│ │                          [🗑️ Xóa]     │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ ┌─ Người ký #2 ─────────────────────────┐  │
│ │ Loại: [🏢 Tổ chức]                    │  │
│ │                                        │  │
│ │ Tổ chức: [Công ty ABC ▼]             │  │
│ │ → Nguyễn Văn A - abc@company.com      │  │
│ │ Thứ tự: [2]                           │  │
│ │                          [🗑️ Xóa]     │  │
│ └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2. CC Email Section
```
┌─────────────────────────────────────────────┐
│ 📧 CC - Nhận bản sao                        │
├─────────────────────────────────────────────┤
│ [➕ Thêm CC]                                │
│                                             │
│ • email1@example.com [❌]                   │
│ • email2@example.com [❌]                   │
│                                             │
│ [________________] [Thêm]                   │
└─────────────────────────────────────────────┘
```

### 3. Attachments Section
```
┌─────────────────────────────────────────────┐
│ 📎 File đính kèm                            │
├─────────────────────────────────────────────┤
│ [➕ Thêm file đính kèm]                     │
│                                             │
│ • document.pdf (2.5 MB) [❌]                │
│ • image.jpg (1.2 MB) [❌]                   │
└─────────────────────────────────────────────┘
```

## 🏗️ Implementation Plan

### Phase 1: State Management (30 mins)
```typescript
// Add to documents page state
const [signers, setSigners] = useState<Signer[]>([]);
const [ccEmails, setCcEmails] = useState<string[]>([]);
const [attachments, setAttachments] = useState<File[]>([]);
const [signerType, setSignerType] = useState<'manual' | 'external'>('manual');
```

### Phase 2: Signers Component (1 hour)
**File**: `frontend/components/documents/SignersSection.tsx`

```tsx
interface Signer {
  id: string;
  type: 'manual' | 'external';
  email: string;
  name: string;
  order: number;
  externalOrgId?: number;
}

export function SignersSection({ 
  signers, 
  onChange 
}: SignersSectionProps) {
  // Component logic
}
```

**Features**:
- ✅ Add/Remove signers
- ✅ Toggle manual/external
- ✅ External org dropdown
- ✅ Auto-fill from org
- ✅ Signing order

### Phase 3: CC Emails Component (30 mins)
**File**: `frontend/components/documents/CCEmailsSection.tsx`

```tsx
export function CCEmailsSection({ 
  emails, 
  onChange 
}: CCEmailsSectionProps) {
  const [newEmail, setNewEmail] = useState('');
  
  const addEmail = () => {
    if (validateEmail(newEmail)) {
      onChange([...emails, newEmail]);
      setNewEmail('');
    }
  };
  
  const removeEmail = (email: string) => {
    onChange(emails.filter(e => e !== email));
  };
}
```

**Features**:
- ✅ Add email with validation
- ✅ Remove email
- ✅ Email format validation

### Phase 4: Attachments Component (30 mins)
**File**: `frontend/components/documents/AttachmentsSection.tsx`

```tsx
export function AttachmentsSection({ 
  files, 
  onChange 
}: AttachmentsSectionProps) {
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    onChange([...files, ...newFiles]);
  };
  
  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };
}
```

**Features**:
- ✅ Multiple file upload
- ✅ File size display
- ✅ Remove file
- ✅ File type validation

### Phase 5: Backend Integration (1 hour)

#### API Changes

**Upload Endpoint**: `POST /api/v1/documents`

```typescript
// Request body
{
  file_name: string;
  file_base64: string;
  document_type_id: number;
  
  // NEW: Signers
  signers?: Array<{
    email: string;
    name: string;
    order: number;
    type: 'manual' | 'external';
    external_org_id?: number;
  }>;
  
  // NEW: CC Emails
  cc_emails?: string[];
  
  // NEW: Attachments
  attachments?: Array<{
    file_name: string;
    file_base64: string;
    file_type: string;
  }>;
}
```

#### Backend Service Updates

**File**: `backend/src/modules/documents/documents.service.ts`

```typescript
async createDocument(input: CreateDocumentInput) {
  // ... existing code
  
  // Create signers if provided
  if (input.signers && input.signers.length > 0) {
    for (const signer of input.signers) {
      await signersRepository.create({
        sign_request_id: signRequest.id,
        email: signer.email,
        name: signer.name,
        signing_order: signer.order,
        role: 'Signer',
      });
    }
  }
  
  // Save CC emails
  if (input.cc_emails && input.cc_emails.length > 0) {
    // Store in metadata or separate table
  }
  
  // Save attachments
  if (input.attachments && input.attachments.length > 0) {
    for (const attachment of input.attachments) {
      const filePath = await saveBase64Document(
        tenantId, 
        attachment.file_name, 
        attachment.file_base64
      );
      // Link to document
    }
  }
}
```

### Phase 6: UI Integration (30 mins)

**File**: `frontend/app/(dashboard)/documents/page.tsx`

```tsx
{/* After workflow section */}
{selectedDocType?.require_digital_signing && (
  <>
    <SignersSection 
      signers={signers}
      onChange={setSigners}
    />
    
    <CCEmailsSection 
      emails={ccEmails}
      onChange={setCcEmails}
    />
    
    <AttachmentsSection 
      files={attachments}
      onChange={setAttachments}
    />
  </>
)}
```

## 📊 Database Schema

### New Table: `document_attachments`
```sql
CREATE TABLE document_attachments (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

### New Table: `document_cc_emails`
```sql
CREATE TABLE document_cc_emails (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

## 🎨 UI/UX Considerations

### Conditional Display
- Only show Signers section if `require_digital_signing = true`
- CC Emails always available
- Attachments always available

### Validation
- At least 1 signer required if digital signing enabled
- Email format validation for CC
- File size limits for attachments (10MB per file)
- Max 5 attachments

### User Flow
```
1. Select document type
2. Upload main PDF
3. [If digital signing] Add signers
4. [Optional] Add CC emails
5. [Optional] Add attachments
6. Click "Tải tài liệu"
7. → Backend creates document + signers + CC + attachments
8. → Redirect to editor (if digital signing)
```

## 📊 Estimated Time Breakdown

| Task | Time |
|------|------|
| State management | 30 mins |
| SignersSection component | 1 hour |
| CCEmailsSection component | 30 mins |
| AttachmentsSection component | 30 mins |
| Backend API updates | 1 hour |
| UI integration | 30 mins |
| Testing | 30 mins |
| **Total** | **4 hours** |

## 🚀 Benefits

### User Experience
- ✅ One-page form (no dialog)
- ✅ All info in one place
- ✅ Faster workflow
- ✅ Less clicks

### Features
- ✅ External org integration
- ✅ CC notifications
- ✅ Supporting documents
- ✅ Complete in one step

## 🔜 Next Steps

1. Create components (SignersSection, CCEmailsSection, AttachmentsSection)
2. Update backend API
3. Add database tables
4. Integrate into upload form
5. Test end-to-end

---

**Status**: 📋 Ready for Implementation  
**Priority**: High  
**Complexity**: Medium-High
