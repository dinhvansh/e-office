# Digital Signature Implementation

**Date**: 2025-11-23  
**Status**: 📋 Planning  
**Priority**: High  
**Complexity**: High (8-12 hours)

## 🎯 Goal

Implement digital signature functionality cho cả 2 luồng:
1. **Internal Users** (Nội bộ) - Đăng nhập hệ thống
2. **External Signers** (Bên ngoài) - Ký qua email link

## 📊 Current Status

### ✅ Đã có:
- `signature_pad` library (npm package)
- Sign request fields system
- Signers table với signing_token
- OTP verification
- Email notifications

### ❌ Chưa có:
- Signature canvas component
- Public signing page (`/sign/[token]`)
- Internal signing page
- Signature storage (image/data)
- Signature placement on PDF

## 🏗️ Architecture

### 1. **Internal Signing Flow** (Nội bộ)

```
User Dashboard
  ↓
Approvals Page → Click "Approve"
  ↓
Approval Dialog
  ├─ Comment (optional)
  ├─ Signature Method:
  │   • Draw (Canvas)
  │   • Upload Image
  │   • Digital Certificate
  └─ [Approve Button]
  ↓
API: POST /approvals/:id/approve
  ↓
Save signature + Update status
```

### 2. **External Signing Flow** (Bên ngoài)

```
Email Notification
  ↓
Click Link: /sign/{token}
  ↓
OTP Verification
  ↓
Signing Page
  ├─ View PDF
  ├─ See signature fields
  ├─ Click field → Signature Modal
  │   • Draw (Canvas)
  │   • Upload Image
  │   • Type Name
  └─ [Submit Signature]
  ↓
API: POST /public/sign/:token/sign
  ↓
Save signature + Update status
```

## 🎨 UI Components

### Component 1: SignatureModal

**File**: `frontend/components/signature/SignatureModal.tsx`

```tsx
interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureData: string) => void;
  signerName: string;
}

// Tabs:
// 1. Draw - Canvas với signature_pad
// 2. Upload - File input (image)
// 3. Type - Text input → Generate image
// 4. Certificate - Digital certificate (optional)
```

**Features**:
- Canvas 400x200px
- Clear button
- Preview signature
- Confirm/Cancel buttons

### Component 2: SignatureCanvas

**File**: `frontend/components/signature/SignatureCanvas.tsx`

```tsx
import SignaturePad from 'signature_pad';

// Wrapper around signature_pad library
// Export as base64 image
```

### Component 3: PublicSigningPage

**File**: `frontend/app/sign/[token]/page.tsx`

```tsx
// Public page (no auth required)
// 1. Verify token
// 2. Show PDF with fields
// 3. Click field → Open SignatureModal
// 4. Submit signature
```

## 📦 Database Schema

### Current: `signers` table
```sql
CREATE TABLE signers (
  id SERIAL PRIMARY KEY,
  sign_request_id INT,
  email VARCHAR(255),
  name VARCHAR(255),
  signing_order INT,
  status VARCHAR(50), -- 'pending', 'completed'
  signing_token VARCHAR(255) UNIQUE,
  otp VARCHAR(10),
  otp_expire TIMESTAMP,
  signed_at TIMESTAMP,
  position_data JSON, -- {x, y, page, width, height}
  -- MISSING: signature_data
);
```

### Add: `signature_data` field
```sql
ALTER TABLE signers 
ADD COLUMN signature_data TEXT; -- Base64 image or signature path

ADD COLUMN signature_type VARCHAR(20); -- 'drawn', 'uploaded', 'typed', 'certificate'
```

## 🔐 Security

### Internal Signing
- ✅ User must be logged in
- ✅ User must have permission
- ✅ Verify user is the approver

### External Signing
- ✅ Token-based authentication
- ✅ OTP verification
- ✅ Token expires after use
- ✅ Rate limiting (prevent brute force)

## 📝 Implementation Steps

### Phase 1: Signature Components (3 hours)

#### 1.1 SignatureCanvas Component (1 hour)
```bash
# Install if not already
npm install signature_pad --save

# Create component
frontend/components/signature/SignatureCanvas.tsx
```

**Features**:
- Initialize signature_pad
- Clear function
- Export as base64
- Responsive canvas

#### 1.2 SignatureModal Component (1.5 hours)
```bash
frontend/components/signature/SignatureModal.tsx
```

**Tabs**:
1. **Draw** - SignatureCanvas
2. **Upload** - File input + preview
3. **Type** - Text input → Generate signature image
4. **Certificate** - Digital certificate (future)

#### 1.3 Testing (30 mins)
- Test canvas drawing
- Test upload
- Test type signature
- Test export base64

### Phase 2: External Signing Page (3 hours)

#### 2.1 Public Signing Page (2 hours)
```bash
frontend/app/sign/[token]/page.tsx
```

**Features**:
- Verify token (API call)
- Show document info
- PDF viewer with fields
- Click field → Open SignatureModal
- Submit signature

#### 2.2 Backend API (1 hour)
```bash
backend/src/modules/public/publicSign.controller.ts
```

**Endpoints**:
- `GET /public/sign/:token` - Get signing data
- `POST /public/sign/:token/sign` - Submit signature
- `POST /public/sign/:token/send-otp` - Send OTP

### Phase 3: Internal Signing (2 hours)

#### 3.1 Approval Dialog Enhancement (1 hour)
```bash
frontend/app/(dashboard)/approvals/page.tsx
```

**Add**:
- SignatureModal integration
- Signature preview
- Submit with signature

#### 3.2 Backend Integration (1 hour)
```bash
backend/src/modules/approvals/approvals.service.ts
```

**Update**:
- Save signature_data
- Save signature_type
- Update signed_at timestamp

### Phase 4: Signature Storage & Display (2 hours)

#### 4.1 Signature Storage (1 hour)
- Save base64 to database OR
- Save as image file to storage
- Generate thumbnail

#### 4.2 Signature Display (1 hour)
- Show signatures on PDF
- Signature history
- Download signed PDF

### Phase 5: Testing & Polish (2 hours)

#### 5.1 End-to-End Testing (1 hour)
- Test internal signing flow
- Test external signing flow
- Test OTP verification
- Test signature display

#### 5.2 UI/UX Polish (1 hour)
- Loading states
- Error handling
- Toast notifications
- Responsive design

## 🎯 Acceptance Criteria

### Internal Signing
- [ ] User can draw signature
- [ ] User can upload signature image
- [ ] Signature saved to database
- [ ] Approval status updated
- [ ] Signature displayed on document

### External Signing
- [ ] Receive email with link
- [ ] Click link → Verify OTP
- [ ] View document
- [ ] Click field → Sign
- [ ] Draw/Upload/Type signature
- [ ] Submit → Status updated
- [ ] Email confirmation sent

### Security
- [ ] Token expires after use
- [ ] OTP verification required
- [ ] Rate limiting implemented
- [ ] Signature cannot be modified

## 📊 Estimated Time

| Phase | Task | Time |
|-------|------|------|
| 1 | Signature Components | 3 hours |
| 2 | External Signing Page | 3 hours |
| 3 | Internal Signing | 2 hours |
| 4 | Storage & Display | 2 hours |
| 5 | Testing & Polish | 2 hours |
| **Total** | | **12 hours** |

## 🚀 Quick Start (MVP - 4 hours)

Nếu muốn nhanh, làm MVP trước:

### MVP Scope:
1. ✅ SignatureCanvas component (1 hour)
2. ✅ External signing page (2 hours)
3. ✅ Basic storage (30 mins)
4. ✅ Testing (30 mins)

**Skip for MVP**:
- Upload signature image
- Type signature
- Digital certificate
- Internal signing (use simple approve button)

## 📚 Libraries

### signature_pad
```bash
npm install signature_pad
npm install @types/signature_pad --save-dev
```

**Usage**:
```typescript
import SignaturePad from 'signature_pad';

const canvas = document.querySelector('canvas');
const signaturePad = new SignaturePad(canvas);

// Get signature as base64
const dataURL = signaturePad.toDataURL();

// Clear
signaturePad.clear();
```

## 🎨 UI Examples (DocuSign Style)

### Signature Modal
```
┌─────────────────────────────────────────┐
│ ✍️ Ký tài liệu                          │
├─────────────────────────────────────────┤
│ [Vẽ] [Upload] [Gõ tên]                 │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     [Canvas - Vẽ chữ ký ở đây]   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [🗑️ Xóa]  [❌ Hủy]  [✅ Xác nhận]    │
└─────────────────────────────────────────┘
```

### Public Signing Page
```
┌─────────────────────────────────────────┐
│ 📄 Ký tài liệu: Hợp đồng ABC           │
├─────────────────────────────────────────┤
│ Người ký: Nguyễn Văn A                  │
│ Email: abc@example.com                  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   [PDF Viewer]                  │   │
│  │                                 │   │
│  │   [Signature Field - Click me]  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [📤 Hoàn tất ký]                      │
└─────────────────────────────────────────┘
```

---

**Status**: 📋 Ready for Implementation  
**Next Step**: Implement SignatureCanvas component first

