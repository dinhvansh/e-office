# TODO: Audit Trail Enhancements

**Priority:** High  
**Estimated Time:** 3-4 hours  
**Status:** ✅ COMPLETE (2025-11-28)

> **Implementation completed!** See `docs/dev/SESSION-2025-11-28-AUDIT-TRAIL-ENHANCEMENTS.md` for details.

---

## 🎯 Requirements

### 1. Auto-generate PDF khi internal signing complete
**Current:** Chỉ external signing trigger PDF generation  
**Need:** Internal signing cũng phải trigger

**Implementation:**
- Update `backend/src/modules/signRequests/signRequests.controller.ts`
- Thêm logic check all signed sau khi internal user ký
- Trigger `pdfGenerationService.generateSignedPdf()`

### 2. Thêm Approval History vào Audit Trail
**Current:** Chỉ có signing history  
**Need:** Thêm approval history trước signing

**Layout:**
```
Certificate of Completion
├── Document Info
├── Approval History (NEW)
│   ├── Approver 1: Approved - Date - Comments
│   ├── Approver 2: Approved - Date - Comments
│   └── ...
├── Signing History
│   ├── Signer 1: Signed - Date - IP
│   ├── Signer 2: Signed - Date - IP
│   └── ...
└── Verification
```

**Data needed:**
- Query `document_approvals` table
- Include: approver name, status, date, comments

### 3. Thêm IP Address & Platform info
**Current:** Không có IP và platform  
**Need:** Log IP address và platform (Web/Mobile)

**Fields to add:**
- IP Address (từ `signers.ip_address`)
- User Agent / Platform
- Signing method (OTP/Certificate)

### 4. Thêm Signing Token cho External Signers
**Current:** Không hiển thị token  
**Need:** Hiển thị token hash cho verification

**Display:**
- External signers: Show token hash (first 16 chars)
- Internal signers: Show "Internal User"

### 5. Design Improvements
**Current:** Basic layout  
**Need:** Professional DocuSign-style design

**Enhancements:**
- Add company logo (if available)
- Better typography and spacing
- Color-coded status badges
- Timeline-style layout
- QR code for verification (future)

---

## 📋 Implementation Checklist

### Phase 1: Auto-generate for Internal Signing (1 hour)

- [ ] Update internal signing controller
- [ ] Add check for all signers completed
- [ ] Trigger PDF generation
- [ ] Test with internal signers

**Files to modify:**
- `backend/src/modules/signRequests/signRequests.controller.ts`

### Phase 2: Add Approval History (1 hour)

- [ ] Query `document_approvals` in PDF generation service
- [ ] Add approval history section to audit trail
- [ ] Format approver info (name, date, status, comments)
- [ ] Add visual separator between approvals and signatures

**Files to modify:**
- `backend/src/modules/signRequests/pdfGeneration.service.ts`

**Code snippet:**
```typescript
// Query approvals
const approvals = await prisma.document_approvals.findMany({
  where: { document_id: signRequest.document_id },
  include: { approver: true },
  orderBy: { created_at: 'asc' }
});

// Add approval history section
if (approvals.length > 0) {
  auditPage.drawText('Approval History', {
    x: 50, y: y, size: 16, font: boldFont
  });
  y -= 30;
  
  for (const approval of approvals) {
    // Draw approval box
    auditPage.drawRectangle({...});
    // Draw approver info
    auditPage.drawText(`${approval.approver.full_name} - ${approval.action}`);
    // Draw date and comments
  }
}
```

### Phase 3: Add IP & Platform Info (30 min)

- [ ] Include IP address in signer info
- [ ] Parse user agent for platform info
- [ ] Display in audit trail

**Display format:**
```
Signed: 28/11/2024 14:30
IP: 192.168.1.100
Platform: Web Browser (Chrome)
```

### Phase 4: Add Signing Token (30 min)

- [ ] Show token hash for external signers
- [ ] Add "Internal User" label for internal signers
- [ ] Format token display

**Display format:**
```
External: Token: 5dde4af80c504ced...
Internal: Authentication: Internal User
```

### Phase 5: Design Improvements (1 hour)

- [ ] Add company logo at top
- [ ] Improve typography (better fonts, sizes)
- [ ] Add color-coded status badges
- [ ] Better spacing and alignment
- [ ] Add border decorations
- [ ] Timeline-style layout

**Design elements:**
- Logo: Top center (if tenant has logo)
- Header: Gradient background
- Status badges: Green circle for approved/signed
- Timeline: Vertical line connecting events
- Footer: Signature verification info

---

## 🎨 Enhanced Audit Trail Design

```
┌─────────────────────────────────────────────────────────┐
│                    [COMPANY LOGO]                       │
│                                                         │
│           🎉 Certificate of Completion                  │
│                                                         │
│  Document: [Title]                                      │
│  Document Number: [Number]                              │
│  Completed: [Date & Time]                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  📋 Approval History                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● Nguyễn Văn A - Trưởng phòng                   │   │
│  │   Status: ✅ Approved                            │   │
│  │   Date: 27/11/2024 14:30                        │   │
│  │   Comments: "Đồng ý phê duyệt"                  │   │
│  └─────────────────────────────────────────────────┘   │
│  │                                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● Trần Thị B - Giám đốc                         │   │
│  │   Status: ✅ Approved                            │   │
│  │   Date: 27/11/2024 15:45                        │   │
│  │   Comments: "OK"                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ✍️ Signing History                                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● Lê Văn C - External Signer                    │   │
│  │   Email: info@abc.com.vn                        │   │
│  │   Signed: 28/11/2024 00:24                      │   │
│  │   IP: 192.168.1.100                             │   │
│  │   Platform: Web Browser                         │   │
│  │   Token: b75a31f077b058b1...                    │   │
│  │   Status: ✅ Signed                              │   │
│  └─────────────────────────────────────────────────┘   │
│  │                                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● Admin User - Internal Signer                  │   │
│  │   Email: admin@acme.local                       │   │
│  │   Signed: 28/11/2024 22:19                      │   │
│  │   IP: 192.168.1.50                              │   │
│  │   Platform: Web Browser                         │   │
│  │   Authentication: Internal User                 │   │
│  │   Status: ✅ Signed                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  🔒 Verification                                        │
│  This document was signed using E-Office                │
│  Document ID: 74                                        │
│  Verification URL: [URL]                                │
│  Generated: 29/11/2024 22:45                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] Test PDF generation after internal signing
- [ ] Verify approval history appears correctly
- [ ] Check IP addresses are logged
- [ ] Verify token display for external signers
- [ ] Test with documents that have:
  - [ ] Only approvals (no signing)
  - [ ] Only signing (no approvals)
  - [ ] Both approvals and signing
  - [ ] Multiple approvers and signers
  - [ ] Mix of internal and external signers

---

## 📚 Technical Notes

### Vietnamese Font Support
**Issue:** StandardFonts don't support Vietnamese diacritics  
**Solution:** Embed custom Unicode font (Roboto, Noto Sans)

```typescript
const fontBytes = fs.readFileSync('fonts/Roboto-Regular.ttf');
const customFont = await pdfDoc.embedFont(fontBytes);
```

### IP Address Logging
**Current:** `signers.ip_address` field exists but may be null  
**Need:** Ensure IP is captured during signing

**Update signing endpoints:**
```typescript
const ipAddress = req.ip || req.connection.remoteAddress;
await prisma.signers.update({
  where: { id: signerId },
  data: { 
    ip_address: ipAddress,
    user_agent: req.headers['user-agent']
  }
});
```

---

## 🔮 Future Enhancements

1. **QR Code** - Add QR code for mobile verification
2. **Blockchain** - Store document hash on blockchain
3. **Digital Certificate** - Add cryptographic signature
4. **Multi-language** - Support English/Vietnamese
5. **Custom Branding** - Tenant-specific logos and colors
6. **Watermark** - Add "Digitally Signed" watermark to all pages

---

**Created:** 2025-11-29  
**Last Updated:** 2025-11-29  
**Assigned To:** Dev Team
