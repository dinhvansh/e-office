# Prompt for Next Session - 2025-11-23

## 🎯 Main Task

Implement **Inline Recipients, CC & Attachments** trong form upload document.

## 📋 Context

Hiện tại khi upload document có `require_digital_signing = true`, hệ thống hiển thị dialog "Add Recipients" riêng. User muốn tích hợp trực tiếp vào form upload để giảm số bước.

## 🎯 Requirements

Thêm 3 sections vào form upload:

### 1. Người Ký (Signers)
- Toggle: "👤 Nhập thủ công" vs "🏢 Tổ chức bên ngoài"
- Manual: Input email + name
- External: Dropdown chọn từ external_organizations
- Thứ tự ký (signing order)
- Add/Remove multiple signers

### 2. CC Email
- Input email với validation
- Add/Remove emails
- Danh sách emails nhận bản sao

### 3. Đính Kèm (Attachments)
- Upload multiple files
- Hiển thị file name + size
- Remove file
- Max 5 files, 10MB per file

## 📄 Spec Document

Đọc chi tiết tại: `docs/dev/FEATURE-INLINE-RECIPIENTS-CC-ATTACHMENTS.md`

## 🏗️ Implementation Steps

### Step 1: Create Components (2 hours)
```bash
# Create 3 new components
frontend/components/documents/SignersSection.tsx
frontend/components/documents/CCEmailsSection.tsx
frontend/components/documents/AttachmentsSection.tsx
```

### Step 2: Update Backend (1 hour)
```typescript
// Update documents.service.ts
- Accept signers[] in createDocument
- Accept cc_emails[] in createDocument
- Accept attachments[] in createDocument
- Create signers after document creation
- Save CC emails to new table
- Save attachments to new table
```

### Step 3: Database Migration (30 mins)
```sql
-- Create new tables
CREATE TABLE document_attachments (...)
CREATE TABLE document_cc_emails (...)

-- Run migration
npx prisma db push
```

### Step 4: Integrate into Upload Form (30 mins)
```tsx
// In documents/page.tsx
{selectedDocType?.require_digital_signing && (
  <SignersSection signers={signers} onChange={setSigners} />
)}
<CCEmailsSection emails={ccEmails} onChange={setCcEmails} />
<AttachmentsSection files={attachments} onChange={setAttachments} />
```

### Step 5: Testing (30 mins)
- Test manual signer input
- Test external org selection
- Test CC emails
- Test attachments upload
- Test full flow end-to-end

## 📊 Estimated Time: 4 hours

## 🔧 Technical Notes

### State Management
```typescript
const [signers, setSigners] = useState<Signer[]>([]);
const [ccEmails, setCcEmails] = useState<string[]>([]);
const [attachments, setAttachments] = useState<File[]>([]);
```

### API Payload
```typescript
{
  file_name: string;
  file_base64: string;
  document_type_id: number;
  signers?: Array<{
    email: string;
    name: string;
    order: number;
    type: 'manual' | 'external';
    external_org_id?: number;
  }>;
  cc_emails?: string[];
  attachments?: Array<{
    file_name: string;
    file_base64: string;
  }>;
}
```

## ✅ Acceptance Criteria

- [ ] Form hiển thị 3 sections mới khi chọn document type có digital signing
- [ ] Có thể add/remove signers
- [ ] Có thể toggle giữa manual và external org
- [ ] External org dropdown hoạt động, auto-fill email + name
- [ ] Có thể add/remove CC emails với validation
- [ ] Có thể upload multiple attachments
- [ ] Backend tạo signers khi upload document
- [ ] Backend lưu CC emails
- [ ] Backend lưu attachments
- [ ] Redirect đến editor sau khi upload (nếu có digital signing)
- [ ] All TypeScript errors resolved
- [ ] Tested end-to-end

## 📝 Files to Modify

### Frontend
- `frontend/components/documents/SignersSection.tsx` (NEW)
- `frontend/components/documents/CCEmailsSection.tsx` (NEW)
- `frontend/components/documents/AttachmentsSection.tsx` (NEW)
- `frontend/app/(dashboard)/documents/page.tsx` (MODIFY)

### Backend
- `backend/src/modules/documents/documents.service.ts` (MODIFY)
- `backend/src/modules/documents/documents.controller.ts` (MODIFY)
- `backend/prisma/schema.prisma` (ADD 2 tables)

## 🎯 Success Metrics

- Upload form có 3 sections mới
- Có thể chọn external organizations
- Có thể add CC emails
- Có thể upload attachments
- Backend lưu tất cả data
- No TypeScript errors
- End-to-end flow hoạt động

## 💡 Tips

1. Bắt đầu với SignersSection (phức tạp nhất)
2. Reuse code từ AddRecipientsDialog.tsx
3. Test từng component riêng trước khi integrate
4. Validate data trước khi submit
5. Handle errors gracefully

---

**Ready to implement!** 🚀
