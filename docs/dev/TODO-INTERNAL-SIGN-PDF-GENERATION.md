# TODO: Internal Sign - PDF Generation with Multiple Field Signatures

## Current Status

✅ **Completed**:
- Frontend: PDFSigningViewer hiển thị signature fields
- Frontend: User có thể ký multiple fields
- Frontend: Gửi `field_signatures` object lên backend
- Backend: API accept `field_signatures`
- Backend: Lưu field signatures vào `signers.position_data`

❌ **Pending**:
- Backend: `pdfGenerationService` chưa apply multiple signatures lên PDF
- Signed PDF chỉ có 1 signature (hoặc không có)

## Problem

Khi internal user ký xong, `pdfGenerationService.generateSignedPdf()` được gọi nhưng:
1. Nó chỉ lấy `signer.signature_data` (1 signature duy nhất)
2. Không biết field signatures nằm ở đâu trong `position_data`
3. Không biết coordinates của từng field
4. Kết quả: Signed PDF không có chữ ký hoặc chỉ có 1 chữ ký

## Data Structure

### Signers Table
```typescript
{
  id: 61,
  signature_data: "data:image/png;base64,...",  // First signature only
  position_data: {                               // All field signatures
    "18": "data:image/png;base64,...",          // field_id: signature
    "19": "text value"
  }
}
```

### Sign Request Fields Table
```typescript
{
  id: 18,
  sign_request_id: 43,
  assigned_signer_id: 61,
  type: "signature",
  page: 1,
  x: 70.69,      // Percentage
  y: 57.40,      // Percentage
  width: 18.59,  // Percentage
  height: 9.31   // Percentage
}
```

## Solution

Update `backend/src/modules/signRequests/pdfGeneration.service.ts`:

### Step 1: Load Field Signatures

```typescript
async generateSignedPdf(signRequestId: number): Promise<string> {
  // Get sign request with signers and fields
  const signRequest = await prisma.sign_requests.findUnique({
    where: { id: signRequestId },
    include: {
      document: true,
      signers: {
        where: { status: 'signed' }
      },
      fields: true  // ✅ Include fields
    }
  });

  // For each signer
  for (const signer of signRequest.signers) {
    // Check if signer has field signatures in position_data
    const fieldSignatures = signer.position_data as Record<string, string> | null;
    
    if (fieldSignatures && typeof fieldSignatures === 'object') {
      // New format: multiple field signatures
      for (const [fieldIdStr, signatureData] of Object.entries(fieldSignatures)) {
        const fieldId = parseInt(fieldIdStr);
        
        // Find field info
        const field = signRequest.fields.find(f => f.id === fieldId);
        if (!field) continue;
        
        // Apply signature to PDF at field position
        await this.applySignatureToField(pdfDoc, field, signatureData);
      }
    } else if (signer.signature_data) {
      // Old format: single signature
      // Find first field for this signer
      const field = signRequest.fields.find(f => 
        f.assigned_signer_id === signer.id && f.type === 'signature'
      );
      
      if (field) {
        await this.applySignatureToField(pdfDoc, field, signer.signature_data);
      }
    }
  }
}
```

### Step 2: Apply Signature to Field

```typescript
private async applySignatureToField(
  pdfDoc: PDFDocument,
  field: any,
  signatureData: string
): Promise<void> {
  const page = pdfDoc.getPage(field.page - 1);  // 0-indexed
  const { width: pageWidth, height: pageHeight } = page.getSize();
  
  // Convert percentage to absolute coordinates
  const x = (field.x / 100) * pageWidth;
  const y = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
  const width = (field.width / 100) * pageWidth;
  const height = (field.height / 100) * pageHeight;
  
  if (field.type === 'signature') {
    // Embed signature image
    const imageBytes = Buffer.from(signatureData.split(',')[1], 'base64');
    const image = await pdfDoc.embedPng(imageBytes);
    
    page.drawImage(image, {
      x,
      y,
      width,
      height
    });
  } else if (field.type === 'text' || field.type === 'date') {
    // Draw text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(signatureData, {
      x,
      y: y + height / 2,  // Center vertically
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
  }
}
```

### Step 3: Handle Coordinate System

**Important**: PDF coordinate system có origin ở bottom-left, nhưng frontend (canvas) có origin ở top-left.

Conversion:
```typescript
// Frontend stores: y from top (0-100%)
// PDF needs: y from bottom

const pdfY = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
```

## Testing

### Test Script

Create `backend/scripts/test-internal-sign-pdf.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Find a completed internal sign request
  const signRequest = await prisma.sign_requests.findFirst({
    where: {
      status: 'completed',
      signers: {
        some: {
          is_internal: true,
          status: 'signed'
        }
      }
    },
    include: {
      document: true,
      signers: true,
      fields: true
    }
  });

  console.log('Sign Request:', signRequest.id);
  console.log('Document:', signRequest.document.document_number);
  console.log('Signed PDF:', signRequest.document.signed_file_path);
  
  // Check signers
  for (const signer of signRequest.signers) {
    console.log(`\nSigner: ${signer.name}`);
    console.log('  signature_data:', signer.signature_data ? 'YES' : 'NO');
    console.log('  position_data:', signer.position_data);
  }
  
  // Check fields
  console.log(`\nFields: ${signRequest.fields.length}`);
  for (const field of signRequest.fields) {
    console.log(`  Field ${field.id}: ${field.type} at (${field.x}, ${field.y})`);
  }
}

test();
```

### Manual Testing

1. Create document with 2+ signature fields
2. Assign to internal user
3. Sign all fields
4. Check signed PDF:
   - Should have all signatures
   - Signatures should be at correct positions
   - Text fields should show text values

## Files to Update

**Backend**:
- `backend/src/modules/signRequests/pdfGeneration.service.ts` - Main update
- `backend/src/modules/signRequests/signRequests.service.ts` - Already updated ✅

**Testing**:
- `backend/scripts/test-internal-sign-pdf.js` - New test script

## References

- External signing already works correctly (reference implementation)
- `frontend/app/sign/[token]/page.tsx` - External signing page
- `backend/src/modules/public/publicSign.controller.ts` - External signing API

## Notes

- External signing có thể đã implement đúng logic này
- Nên tham khảo code của external signing
- Coordinate conversion rất quan trọng (top-left vs bottom-left)
- Test với nhiều loại fields: signature, text, date
