# Feature: Signed PDF with Audit Trail

**Status:** 🟡 Partially Implemented  
**Priority:** High  
**Estimated Time:** 4-6 hours

---

## 🎯 Goal

When all signers complete signing, automatically generate a final PDF that includes:
1. **Original document** with signatures placed in correct positions
2. **Audit Trail page** (like DocuSign) showing complete signing history

---

## 📊 Current Status

### ✅ What's Done
- Script to generate PDF with signatures (`generate-signed-pdf-015-2025.js`)
- pdf-lib integration for drawing signatures on PDF
- Field values stored in database
- Signature images stored as base64

### ❌ What's Missing
1. **API Endpoint** to generate signed PDF
2. **Automatic trigger** when last signer completes
3. **Audit Trail page** generation
4. **Download button** in UI
5. **Certificate of Completion** (optional)

---

## 🏗️ Architecture

### Flow

```
Last Signer Signs
    ↓
Update signer status to 'signed'
    ↓
Check if all signers completed
    ↓
YES → Trigger PDF generation
    ↓
Generate signed PDF with:
  - Original pages with signatures
  - Audit trail page
    ↓
Save to storage/{tenant_id}/signed_{timestamp}_{doc_id}.pdf
    ↓
Update document.signed_file_path
    ↓
Update sign_request.status = 'completed'
    ↓
Send completion emails
```

### Database Changes

**Already exists:**
- `documents.signed_file_path` - Path to signed PDF
- `sign_request_field_values` - Signature data
- `signers.signed_at` - Timestamp

**No changes needed!**

---

## 📝 Implementation Plan

### Phase 1: Backend Service (2 hours)

#### 1.1 Create PDF Generation Service

**File:** `backend/src/modules/signRequests/pdfGeneration.service.ts`

```typescript
export class PdfGenerationService {
  /**
   * Generate signed PDF with all signatures and audit trail
   */
  async generateSignedPdf(signRequestId: number): Promise<string> {
    // 1. Load sign request with signers and field values
    // 2. Load original PDF
    // 3. Draw signatures on fields
    // 4. Add audit trail page
    // 5. Save to storage
    // 6. Return file path
  }

  /**
   * Create audit trail page
   */
  private async createAuditTrailPage(pdfDoc: PDFDocument, signRequest: any): Promise<void> {
    // Add new page at end
    // Draw header: "Certificate of Completion"
    // Draw document info
    // Draw signer table with:
    //   - Name, Email, Role
    //   - Signed Date & Time
    //   - IP Address (if available)
    //   - Status
    // Draw footer with verification info
  }

  /**
   * Draw signature on PDF field
   */
  private async drawSignatureOnField(
    page: PDFPage,
    field: any,
    fieldValue: any
  ): Promise<void> {
    // Convert percentage coordinates to actual
    // Draw signature image or text
  }
}
```

#### 1.2 Update Signing Controller

**File:** `backend/src/modules/public/publicSign.controller.ts`

Add after successful signing:

```typescript
// After updating signer status
const allSigned = await this.checkIfAllSigned(signRequestId);

if (allSigned) {
  // Generate signed PDF
  const signedFilePath = await pdfGenerationService.generateSignedPdf(signRequestId);
  
  // Update document
  await prisma.documents.update({
    where: { id: document.id },
    data: { 
      signed_file_path: signedFilePath,
      status: 'completed'
    }
  });
  
  // Update sign request
  await prisma.sign_requests.update({
    where: { id: signRequestId },
    data: { status: 'completed' }
  });
  
  // Send completion emails
  await emailService.sendCompletionEmails(signRequestId);
}
```

#### 1.3 Add Download Endpoint

**File:** `backend/src/modules/public/publicSign.routes.ts`

```typescript
router.get('/:token/download-signed', publicSignController.downloadSignedPdf);
```

**Controller method:**
```typescript
async downloadSignedPdf(req: Request, res: Response) {
  const { token } = req.params;
  
  // Get signer by token
  const signer = await prisma.signers.findFirst({
    where: { signing_token: token },
    include: { 
      sign_request: { 
        include: { document: true } 
      } 
    }
  });
  
  if (!signer?.sign_request.document.signed_file_path) {
    return res.status(404).json({ error: 'Signed PDF not available yet' });
  }
  
  // Stream file
  const filePath = path.resolve(signer.sign_request.document.signed_file_path);
  res.download(filePath, `${signer.sign_request.document.document_number}_signed.pdf`);
}
```

---

### Phase 2: Audit Trail Page Design (1 hour)

#### Layout (DocuSign-style)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           🎉 Certificate of Completion              │
│                                                     │
│  Document: [Title]                                  │
│  Document Number: [Number]                          │
│  Completed: [Date & Time]                           │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Signing History                                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 1. [Name] - [Role]                          │   │
│  │    Email: [email]                           │   │
│  │    Signed: [Date & Time]                    │   │
│  │    IP: [IP Address]                         │   │
│  │    Status: ✅ Signed                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 2. [Name] - [Role]                          │   │
│  │    Email: [email]                           │   │
│  │    Signed: [Date & Time]                    │   │
│  │    IP: [IP Address]                         │   │
│  │    Status: ✅ Signed                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Verification                                       │
│  This document was signed using E-Office            │
│  Document ID: [UUID]                                │
│  Verification URL: [URL]                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
private async createAuditTrailPage(
  pdfDoc: PDFDocument,
  signRequest: any
): Promise<void> {
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = 750;
  
  // Header
  page.drawText('Certificate of Completion', {
    x: 150,
    y: y,
    size: 24,
    font: boldFont,
    color: rgb(0, 0.4, 0.8)
  });
  
  y -= 50;
  
  // Document info
  page.drawText(`Document: ${signRequest.document.title}`, {
    x: 50, y: y, size: 12, font: font
  });
  y -= 20;
  
  page.drawText(`Document Number: ${signRequest.document.document_number}`, {
    x: 50, y: y, size: 12, font: font
  });
  y -= 20;
  
  page.drawText(`Completed: ${new Date().toLocaleString('vi-VN')}`, {
    x: 50, y: y, size: 12, font: font
  });
  y -= 40;
  
  // Divider
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 545, y: y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });
  y -= 30;
  
  // Signing history header
  page.drawText('Signing History', {
    x: 50, y: y, size: 16, font: boldFont
  });
  y -= 30;
  
  // Signers
  for (const [index, signer] of signRequest.signers.entries()) {
    // Box for each signer
    page.drawRectangle({
      x: 50,
      y: y - 80,
      width: 495,
      height: 85,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });
    
    // Signer info
    page.drawText(`${index + 1}. ${signer.name} - ${signer.role || 'Signer'}`, {
      x: 60, y: y - 20, size: 12, font: boldFont
    });
    
    page.drawText(`Email: ${signer.email}`, {
      x: 60, y: y - 35, size: 10, font: font
    });
    
    const signedDate = signer.signed_at 
      ? new Date(signer.signed_at).toLocaleString('vi-VN')
      : 'Not signed';
    
    page.drawText(`Signed: ${signedDate}`, {
      x: 60, y: y - 50, size: 10, font: font
    });
    
    const statusText = signer.status === 'signed' ? '✓ Signed' : '○ Pending';
    const statusColor = signer.status === 'signed' 
      ? rgb(0, 0.6, 0) 
      : rgb(0.6, 0.6, 0);
    
    page.drawText(`Status: ${statusText}`, {
      x: 60, y: y - 65, size: 10, font: font, color: statusColor
    });
    
    y -= 100;
  }
  
  y -= 20;
  
  // Divider
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 545, y: y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });
  y -= 30;
  
  // Verification section
  page.drawText('Verification', {
    x: 50, y: y, size: 14, font: boldFont
  });
  y -= 20;
  
  page.drawText('This document was signed using E-Office Digital Signature System', {
    x: 50, y: y, size: 10, font: font, color: rgb(0.5, 0.5, 0.5)
  });
  y -= 15;
  
  page.drawText(`Document ID: ${signRequest.document.id}`, {
    x: 50, y: y, size: 9, font: font, color: rgb(0.5, 0.5, 0.5)
  });
  y -= 15;
  
  page.drawText(`Verification URL: ${process.env.FRONTEND_URL}/verify/${signRequest.id}`, {
    x: 50, y: y, size: 9, font: font, color: rgb(0, 0.4, 0.8)
  });
}
```

---

### Phase 3: Frontend Integration (1 hour)

#### 3.1 Add Download Button

**File:** `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

After signing completes:

```typescript
{signRequest.status === 'completed' && (
  <Button
    onClick={() => window.open(`/api/public/sign/${mySigner.signing_token}/download-signed`)}
    className="w-full"
  >
    <Download className="w-4 h-4 mr-2" />
    Download Signed Document
  </Button>
)}
```

#### 3.2 Add to Document Flow Page

**File:** `frontend/app/(dashboard)/documents/[id]/flow/page.tsx`

```typescript
{document.signed_file_path && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-green-900">
          ✅ Document Completed
        </h3>
        <p className="text-sm text-green-700">
          All signers have completed signing
        </p>
      </div>
      <Button
        onClick={() => downloadSignedPdf(document.id)}
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Signed PDF
      </Button>
    </div>
  </div>
)}
```

---

### Phase 4: Email Notification (30 min)

**File:** `backend/src/modules/common/email.service.ts`

```typescript
async sendCompletionEmails(signRequestId: number) {
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: signRequestId },
    include: {
      document: true,
      signers: true
    }
  });
  
  // Email to all signers
  for (const signer of signRequest.signers) {
    await this.sendEmail({
      to: signer.email,
      subject: `Document Completed: ${signRequest.document.title}`,
      html: `
        <h2>Document Signing Completed</h2>
        <p>All signers have completed signing the document:</p>
        <p><strong>${signRequest.document.title}</strong></p>
        <p>You can download the signed document here:</p>
        <a href="${process.env.FRONTEND_URL}/sign/${signer.signing_token}/download-signed">
          Download Signed Document
        </a>
      `
    });
  }
  
  // Email to document creator
  const creator = await prisma.users.findUnique({
    where: { id: signRequest.document.created_by }
  });
  
  if (creator) {
    await this.sendEmail({
      to: creator.email,
      subject: `Document Completed: ${signRequest.document.title}`,
      html: `
        <h2>Your Document Has Been Signed</h2>
        <p>All signers have completed signing your document:</p>
        <p><strong>${signRequest.document.title}</strong></p>
        <p>View the document flow:</p>
        <a href="${process.env.FRONTEND_URL}/documents/${signRequest.document.id}/flow">
          View Document Flow
        </a>
      `
    });
  }
}
```

---

## 🧪 Testing Checklist

### Backend
- [ ] PDF generation service creates valid PDF
- [ ] Signatures appear in correct positions
- [ ] Audit trail page renders correctly
- [ ] Download endpoint returns file
- [ ] Automatic trigger works after last signature
- [ ] File saved to correct storage path
- [ ] Database updated with signed_file_path

### Frontend
- [ ] Download button appears when completed
- [ ] Download works from internal signing page
- [ ] Download works from document flow page
- [ ] PDF opens correctly in browser
- [ ] Audit trail page is readable

### Email
- [ ] Completion emails sent to all signers
- [ ] Completion email sent to creator
- [ ] Download links work in emails

---

## 📊 Success Metrics

1. **PDF Quality**
   - Signatures appear crisp and clear
   - Audit trail is professional-looking
   - File size reasonable (<5MB for typical docs)

2. **User Experience**
   - Download available immediately after completion
   - Clear indication document is completed
   - Easy access from multiple places

3. **Reliability**
   - 100% success rate for PDF generation
   - No corrupted PDFs
   - Proper error handling

---

## 🔮 Future Enhancements

1. **Digital Certificate** - Add cryptographic signature
2. **Blockchain Verification** - Store hash on blockchain
3. **QR Code** - Add QR code for mobile verification
4. **Watermark** - Add "Digitally Signed" watermark
5. **Multi-language** - Support English/Vietnamese audit trail
6. **Custom Branding** - Allow tenant logo on audit trail

---

## 📚 References

- DocuSign Certificate of Completion
- Adobe Sign Audit Report
- pdf-lib documentation: https://pdf-lib.js.org/
- Prisma file handling best practices

---

**Created:** 2025-11-29  
**Last Updated:** 2025-11-29
