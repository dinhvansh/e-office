# Fix: Internal Sign Page - Show Signature Fields on PDF

## Problem
Trang internal-sign (`/sign-requests/[id]/internal-sign`) hiển thị PDF nhưng không hiển thị các vùng signature fields để người dùng biết họ sẽ ký ở đâu trên tài liệu.

## Root Causes
1. **Backend**: API endpoint `/sign-requests/:id` không include `fields` trong response
2. **Frontend**: Trang internal-sign dùng `PDFViewer` đơn giản thay vì `PDFSigningViewer`
3. **Frontend**: Infinite loop do useEffect dependencies không đúng
4. **Frontend**: Backend API `/sign-internal` cần cập nhật để nhận field_signatures thay vì signature_data đơn

## Solutions Implemented

### 1. Backend - Include Fields in API Response ✅

**File**: `backend/src/modules/signRequests/signRequests.repository.ts`

```typescript
findById(id: number, tenantId: number) {
  return prisma.sign_requests.findFirst({
    where: { id, tenant_id: tenantId },
    include: { 
      signers: {
        orderBy: { signing_order: 'asc' }
      }, 
      document: true,
      fields: {                    // ✅ Added
        orderBy: { id: 'asc' }
      }
    },
  });
}
```

**Status**: ✅ Completed

### 2. Frontend - Use PDFSigningViewer with Proper State Management ✅

**File**: `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

**Key Changes**:

1. **Import PDFSigningViewer**:
```typescript
import PDFSigningViewer from '@/components/pdf/PDFSigningViewer';
```

2. **Add SignatureField interface**:
```typescript
interface SignatureField {
  id: number;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assigned_signer_id?: number;
}
```

3. **Update SigningData interface**:
```typescript
interface SigningData {
  sign_request: {
    // ... existing fields
    fields: SignatureField[];  // ✅ Added
  };
}
```

4. **Add state for PDF viewer and field management**:
```typescript
const [pdfUrl, setPdfUrl] = useState<string | null>(null);
const [myFields, setMyFields] = useState<SignatureField[]>([]);
const [currentFieldId, setCurrentFieldId] = useState<number | null>(null);
const [pdfLoading, setPdfLoading] = useState(false);
const [guidedMode, setGuidedMode] = useState(false);
const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
const [completedFields, setCompletedFields] = useState<number[]>([]);
const [fieldSignatures, setFieldSignatures] = useState<Record<number, string>>({});
```

5. **Fix infinite loop with proper useEffect**:
```typescript
useEffect(() => {
  fetchSigningData();
}, [signRequestId]);  // Only depend on signRequestId

const fetchSigningData = async () => {
  // Guard: only fetch once
  if (data) return;
  
  // ... rest of fetch logic
};
```

6. **Filter fields for current user**:
```typescript
const fieldsForMe = result.sign_request.fields?.filter(
  (f: SignatureField) => f.assigned_signer_id === currentSigner.id
) || [];
setMyFields(fieldsForMe);
```

7. **Load PDF as blob**:
```typescript
const pdfResponse = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${result.sign_request.document.id}/view`,
  {
    headers: {
      'Authorization': `Bearer ${tokens?.accessToken}`
    }
  }
);
if (pdfResponse.ok) {
  const blob = await pdfResponse.blob();
  const url = URL.createObjectURL(blob);
  setPdfUrl(url);
}
```

8. **Replace PDFViewer with PDFSigningViewer**:
```typescript
{pdfUrl && myFields.length > 0 ? (
  <PDFSigningViewer
    pdfUrl={pdfUrl}
    fields={myFields}
    signerId={mySigner.id}
    onFieldClick={(field) => {
      console.log('Field clicked:', field);
    }}
    guidedMode={guidedMode}
    currentFieldId={guidedMode ? myFields[currentFieldIndex]?.id : undefined}
    completedFieldIds={completedFields}
    existingFieldValues={fieldSignatures}
    onFieldComplete={(fieldId, signature) => {
      setFieldSignatures(prev => ({ ...prev, [fieldId]: signature }));
      setCompletedFields(prev => [...prev, fieldId]);
      
      if (guidedMode && currentFieldIndex < myFields.length - 1) {
        setCurrentFieldIndex(prev => prev + 1);
      }
    }}
  />
) : (
  <div>Loading...</div>
)}
```

9. **Update handleSubmit to send field signatures**:
```typescript
const handleSubmit = async () => {
  if (myFields.length > 0 && completedFields.length < myFields.length) {
    toast.error(`Vui lòng hoàn thành tất cả ${myFields.length} vùng ký`);
    return;
  }

  const result = await fetchJson(`/sign-requests/${signRequestId}/sign-internal`, {
    method: 'POST',
    body: JSON.stringify({
      field_signatures: fieldSignatures,  // ✅ Changed from signature_data
      signature_type: 'drawn'
    })
  });
  
  toast.success('Ký thành công!');
  router.push('/sign-requests');
};
```

10. **Add progress panel**:
```typescript
<div className="p-4 space-y-4">
  {/* Progress bar */}
  <div className="flex items-center justify-between text-sm">
    <span>Đã hoàn thành</span>
    <span>{completedFields.length} / {myFields.length}</span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all"
      style={{ width: `${(completedFields.length / myFields.length) * 100}%` }}
    />
  </div>
  
  {/* Field list with status */}
  {myFields.map((field, idx) => {
    const isCompleted = completedFields.includes(field.id);
    return (
      <div key={field.id} className={isCompleted ? 'bg-green-50' : 'bg-gray-50'}>
        {isCompleted ? '✅' : '⏳'} {field.type} - Trang {field.page}
      </div>
    );
  })}
</div>
```

**Status**: ✅ Completed

### 3. Backend - Update Internal Sign API (TODO) ⚠️

**File**: `backend/src/modules/signRequests/signRequests.controller.ts` (hoặc service)

**Current Issue**: API endpoint `/sign-requests/:id/sign-internal` hiện tại nhận `signature_data` (một chữ ký duy nhất), nhưng frontend giờ gửi `field_signatures` (object chứa nhiều field signatures).

**Required Changes**:

```typescript
// Current (OLD):
{
  signature_data: "data:image/png;base64,...",
  signature_type: "drawn"
}

// New (REQUIRED):
{
  field_signatures: {
    "18": "data:image/png;base64,...",  // field_id: signature_data
    "19": "text value"
  },
  signature_type: "drawn"
}
```

**Backend needs to**:
1. Accept `field_signatures` object instead of single `signature_data`
2. Loop through each field and apply signature to correct position on PDF
3. Use existing field coordinates (x, y, width, height, page) from database
4. Generate signed PDF with all signatures placed correctly

**Status**: ⚠️ TODO - Backend API needs update

## Known Issues

### Issue 1: Infinite Loop (FIXED) ✅
**Problem**: Component re-renders continuously
**Cause**: useEffect dependencies included `user?.id` and `tokens?.accessToken` which change on every render
**Solution**: Only depend on `signRequestId` and add guard `if (data) return` in fetch function

### Issue 2: Field Position Mismatch (PENDING) ⚠️
**Problem**: Signature fields may not appear at correct position on PDF
**Possible Causes**:
- PDF scale calculation in PDFSigningViewer
- Coordinate system mismatch between editor and viewer
- PDF dimensions not calculated correctly

**Debug Steps**:
1. Check console logs for field coordinates
2. Compare with editor page field placement
3. Verify PDF dimensions match between editor and viewer
4. Check scale factor in PDFSigningViewer

### Issue 3: Backend API Not Updated (PENDING) ⚠️
**Problem**: Backend expects single signature, frontend sends multiple field signatures
**Impact**: Submit will fail with error
**Solution**: Update backend controller/service to handle field_signatures object

## Testing

### Test Script
```bash
node backend/scripts/test-sign-request-43-api.js
```

**Expected Output**:
```
✅ Fields found: 2

1. Field ID: 18
   Type: signature
   Page: 1
   Position: (70.69..., 57.40...)
   Assigned to: 61

2. Field ID: 19
   Type: text
   Page: 1
   Position: (70.69..., 68.43...)
   Assigned to: 61
```

### Manual Testing
1. Create sign request with fields using editor page
2. Navigate to `/sign-requests/43/internal-sign`
3. Verify:
   - ✅ PDF loads
   - ✅ No infinite loop in console
   - ✅ Fields info shown in console logs
   - ⚠️ Signature fields appear as colored boxes on PDF (may have position issues)
   - ⚠️ Click field to open signature dialog
   - ⚠️ Complete all fields
   - ⚠️ Submit (will fail until backend updated)

## Next Steps for Dev

1. **Fix Backend API** (Priority: HIGH):
   - Update `/sign-requests/:id/sign-internal` endpoint
   - Accept `field_signatures` object
   - Apply each signature to corresponding field position
   - Test with multiple fields

2. **Fix Field Positioning** (Priority: MEDIUM):
   - Debug PDFSigningViewer coordinate calculation
   - Compare with external signing page (which works)
   - Ensure scale and dimensions match

3. **Test Complete Flow** (Priority: HIGH):
   - Create document with multiple signature fields
   - Assign to internal user
   - Sign using internal-sign page
   - Verify signed PDF has signatures in correct positions

## Related Files

**Backend**:
- `backend/src/modules/signRequests/signRequests.repository.ts` ✅
- `backend/src/modules/signRequests/signRequests.controller.ts` ⚠️ (needs update)
- `backend/src/modules/signRequests/signRequests.service.ts` ⚠️ (needs update)

**Frontend**:
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx` ✅
- `frontend/components/pdf/PDFSigningViewer.tsx` (existing, may need fixes)
- `frontend/app/sign/[token]/page.tsx` (reference for external signing)

**Scripts**:
- `backend/scripts/test-sign-request-43-api.js` ✅
- `backend/scripts/check-sign-request-43.js` ✅

## Notes

- PDFSigningViewer được dùng cho cả external và internal signing
- External signing hoạt động tốt, có thể tham khảo implementation
- Vấn đề chính là backend API chưa hỗ trợ multiple field signatures
- Field positioning có thể cần điều chỉnh scale/coordinates

### 2. Frontend - Use PDFSigningViewer

**File**: `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

**Changes**:

1. Import `PDFSigningViewer`:
```typescript
import PDFSigningViewer from '@/components/pdf/PDFSigningViewer';
```

2. Add interface for SignatureField:
```typescript
interface SignatureField {
  id: number;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assigned_signer_id?: number;
}
```

3. Update SigningData interface to include fields:
```typescript
interface SigningData {
  sign_request: {
    // ... existing fields
    fields: SignatureField[];  // ✅ Added
  };
}
```

4. Add state for PDF and fields:
```typescript
const [pdfUrl, setPdfUrl] = useState<string | null>(null);
const [myFields, setMyFields] = useState<SignatureField[]>([]);
const [currentFieldId, setCurrentFieldId] = useState<number | null>(null);
```

5. Update `fetchSigningData` to load PDF and filter fields:
```typescript
// Filter fields assigned to current signer
const fieldsForMe = result.sign_request.fields?.filter(
  (f: SignatureField) => f.assigned_signer_id === currentSigner.id
) || [];
setMyFields(fieldsForMe);

// Load PDF
if (result.sign_request.document.file_path) {
  const pdfResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${result.sign_request.document.id}/view`,
    {
      headers: {
        'Authorization': `Bearer ${tokens?.accessToken}`
      }
    }
  );
  if (pdfResponse.ok) {
    const blob = await pdfResponse.blob();
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  }
}
```

6. Replace PDFViewer with PDFSigningViewer:
```typescript
{pdfUrl && myFields.length > 0 ? (
  <PDFSigningViewer
    pdfUrl={pdfUrl}
    fields={myFields}
    signerId={mySigner.id}
    onFieldClick={(field) => {
      setCurrentFieldId(field.id);
      console.log('Field clicked:', field);
    }}
    signatureData={signatureData}
    currentFieldId={currentFieldId || undefined}
  />
) : pdfUrl ? (
  <PDFViewer 
    documentId={data.sign_request.document.id} 
    signRequestStatus={data.sign_request.status}
    accessToken={tokens?.accessToken}
  />
) : (
  <div>Loading...</div>
)}
```

## Testing

1. Create a sign request with fields (use editor page)
2. Navigate to `/sign-requests/43/internal-sign`
3. Verify:
   - ✅ PDF loads correctly
   - ✅ Signature fields appear as colored boxes on PDF
   - ✅ Fields are clickable
   - ✅ Only fields assigned to current user are shown

## Test Script

```bash
node backend/scripts/test-sign-request-43-api.js
```

Expected output:
```
✅ Fields found: 2

1. Field ID: 18
   Type: signature
   Page: 1
   Position: (70.69..., 57.40...)
   Size: 18.59...x9.31...
   Assigned to: 61

2. Field ID: 19
   Type: text
   Page: 1
   Position: (70.69..., 68.43...)
   Size: 18.44...x3.64...
   Assigned to: 61
```

## Notes

- PDFSigningViewer hiển thị các vùng signature fields dưới dạng colored boxes overlay trên PDF
- Màu sắc:
  - 🟡 Yellow: Chưa ký (pending)
  - 🔵 Blue: Đang active (user đang ký)
  - 🟢 Green: Đã ký (completed)
  - ⚪ Gray: Disabled (không phải lượt của user)

- Component này tương thích với cả guided mode (từng field một) và normal mode (tự do chọn field)

## Related Files

- `backend/src/modules/signRequests/signRequests.repository.ts`
- `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`
- `frontend/components/pdf/PDFSigningViewer.tsx`
- `backend/scripts/test-sign-request-43-api.js`
- `backend/scripts/check-sign-request-43.js`
