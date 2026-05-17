# 🐛 TODO: Fix Submit Signature Error

## ❌ Problem

Submit signature fails with **400 Bad Request** error.

**Backend Log**:
```
POST /public/sign/.../sign 400 106.092 ms - 123
```

---

## 🔍 Root Cause (To Investigate)

### Possible Issues:

1. **Validation Schema** (Most Likely)
   - Current: `value: z.union([z.string(), z.number(), z.boolean(), z.null()])`
   - Might need: `value: z.any()` back
   - Or: More flexible union type

2. **Field Values Format**
   - Frontend sends: `{ field_id: number, value: string }`
   - Backend expects: Different format?
   - Check: Array structure

3. **OTP Validation**
   - OTP might be expired (10 min limit)
   - Hash comparison might fail
   - Check: OTP in database vs submitted

4. **Required Fields**
   - `validateRequiredFields()` might be too strict
   - Check: What fields are required
   - Verify: All required fields filled

---

## 🔧 Debug Steps

### Step 1: Check Exact Error Message
```bash
# Backend logs
getProcessOutput processId:5

# Look for:
# - Validation error details
# - Which field failed
# - Error message from Zod
```

### Step 2: Test with Simple Payload
```javascript
// Try submitting without field_values
{
  otp: "123456",
  signature_data: "data:image/png;base64,...",
  signature_type: "drawn"
  // NO field_values
}
```

### Step 3: Check Database
```sql
-- Check OTP
SELECT id, email, otp, otp_expire, status 
FROM signers 
WHERE signing_token = '...';

-- Check fields
SELECT * FROM sign_request_fields 
WHERE sign_request_id = 40;
```

### Step 4: Add Debug Logging
```typescript
// In publicSign.controller.ts
console.log('📥 Received body:', JSON.stringify(req.body, null, 2));
console.log('📋 Parsed body:', JSON.stringify(body, null, 2));
console.log('🔍 Validation result:', submitSignatureSchema.safeParse(req.body));
```

---

## 📝 Files to Check

### Backend
1. **`backend/src/modules/public/publicSign.controller.ts`**
   - Line 20-30: Validation schema
   - Line 250-300: Submit function
   - Add more debug logs

2. **`backend/src/modules/signRequests/signRequestFieldValues.service.ts`**
   - `saveFieldValues()` function
   - `validateRequiredFields()` function
   - Check what's required

3. **`backend/src/modules/signers/signers.service.ts`**
   - OTP generation
   - OTP validation
   - Check hash comparison

### Frontend
1. **`frontend/app/sign/[token]/page.tsx`**
   - Line 350-400: `handleSubmitSignature()` function
   - Check payload format
   - Add console.log for debugging

---

## 🧪 Test Cases

### Test 1: Simple Submit (No Field Values)
```bash
# Get fresh OTP
node scripts/quick-test-guided.js

# Submit with only signature
curl -X POST http://localhost:4000/public/sign/[token]/sign \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "signature_data": "data:image/png;base64,iVBORw0KG...",
    "signature_type": "drawn"
  }'
```

**Expected**: Should work if validation schema is the issue

### Test 2: With Field Values
```bash
curl -X POST http://localhost:4000/public/sign/[token]/sign \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "signature_data": "data:image/png;base64,iVBORw0KG...",
    "signature_type": "drawn",
    "field_values": [
      {"field_id": 25, "value": "data:image/png;base64,..."},
      {"field_id": 26, "value": "24/11/2025"}
    ]
  }'
```

**Expected**: Should work if format is correct

### Test 3: Check OTP
```bash
# Get OTP from database
node scripts/check-otp.js [email]

# Verify OTP not expired
# Verify hash matches
```

---

## 💡 Quick Fixes to Try

### Fix 1: Revert Validation Schema
```typescript
// Change back to z.any()
const submitSignatureSchema = z.object({
  otp: z.string().min(6).max(6),
  signature_data: z.string().optional(),
  signature_type: z.enum(['drawn', 'uploaded', 'typed', 'certificate']).optional(),
  field_values: z.array(
    z.object({
      field_id: z.number(),
      value: z.any(), // ← Back to any
    })
  ).optional().default([]),
});
```

### Fix 2: Make Field Values Optional
```typescript
// Don't validate required fields if using signature_data
if (body.field_values && body.field_values.length > 0) {
  // Only validate if field_values provided
  const allFieldsFilled = await signRequestFieldValuesService.validateRequiredFields(signer.id);
  if (!allFieldsFilled) {
    throw ApiError.badRequest('Please fill all required fields');
  }
}
```

### Fix 3: Better Error Messages
```typescript
try {
  const body = submitSignatureSchema.parse(req.body);
} catch (error) {
  console.error('❌ Validation error:', error);
  throw ApiError.badRequest(`Validation failed: ${error.message}`);
}
```

---

## ✅ Success Criteria

- [ ] Submit returns 200 OK
- [ ] Signer status updates to "completed"
- [ ] Document status updates
- [ ] Thank you page shows
- [ ] No console errors

---

## 📞 Commands

```bash
# Get fresh OTP
cd backend
node scripts/quick-test-guided.js

# Check backend logs
getProcessOutput processId:5

# Test submit
node scripts/test-submit-signature.js

# Check database
node scripts/check-sign-requests-status.js
```

---

## 🎯 Estimated Time

**1-2 hours** to debug and fix

**Priority**: 🔴 HIGH - Blocking feature

---

**Created**: 2025-11-24  
**Status**: 🔴 URGENT - Must fix before production  
**Next Session**: Start with this issue first
