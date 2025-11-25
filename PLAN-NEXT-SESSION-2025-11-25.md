# Plan for Next Session - 2025-11-25

## 🎯 Goal
Complete internal-to-external signing flow test (remaining 38% = 5/13 steps)

## ✅ Current Status (62% Complete - 8/13 steps)

**Working:**
- ✅ Admin login
- ✅ Document management
- ✅ Signer configuration
- ✅ Send sign request
- ✅ Submit for approval
- ✅ Approver login
- ✅ Get pending approvals
- ✅ Workflow instance created

**Blocked:**
- ❌ Approve with signature (duplicate submission issue)
- ⏸️ Get external signer token
- ⏸️ Send OTP
- ⏸️ External sign
- ⏸️ Download signed PDF

## 🔧 Issues Found

### Issue 1: Duplicate Submission
**Problem**: Test script tries to submit document that already has workflow
**Evidence**: 
- Workflow instance ID 21 exists
- Approval ID 21 exists
- Error: "Document already has an active workflow"

**Solution Options**:
1. **Option A**: Skip step 6 if workflow exists (check first)
2. **Option B**: Create fresh document each test run
3. **Option C**: Clean up workflow before re-testing

**Recommended**: Option A (check before submit)

### Issue 2: Wrong Approver
**Problem**: Approval assigned to admin (user ID 1) instead of approver user
**Evidence**: Approval record shows approver_user_id: 1
**Expected**: Should be approver@acme.local user

**Solution**: Fix workflow step approver assignment

## 📝 Action Items for Next Session

### Priority 1: Fix Test Script (15 mins)
```javascript
// Step 6: Check if workflow exists before submitting
async function step6_SubmitForApproval() {
  // Check if workflow instance exists
  const existing = await checkWorkflowInstance(documentId);
  
  if (existing) {
    console.log('⏭️  Workflow already exists, skipping submission');
    approvalId = existing.approval_id;
    return true;
  }
  
  // Submit for approval
  const response = await axios.post(...);
  approvalId = response.data.data.id;
  return true;
}
```

### Priority 2: Fix Approver Assignment (30 mins)
**Check workflow step configuration:**
```sql
SELECT * FROM workflow_steps WHERE workflow_id = 12;
```

**Expected**: 
- approver_type: 'role' or 'user'
- approver_id: Should point to Manager role or approver user

**Fix if needed**: Update workflow step or create new workflow

### Priority 3: Complete Remaining Steps (1 hour)

**Step 9: Approve with Signature**
- Use approval ID from database
- Call approve endpoint with signature data
- Verify status changes to 'approved'

**Step 10: Get External Signer Token**
- Query signers table for external signer
- Get signing_token field
- Verify token exists

**Step 11: Send OTP**
- Call public API to send OTP
- Get OTP from response (dev mode)
- Store for next step

**Step 12: External Sign**
- Use token + OTP to sign
- Submit signature data
- Verify signer status = 'signed'

**Step 13: Download Signed PDF**
- Call download endpoint
- Save PDF file
- Verify file size > 0

## 🧪 Testing Commands

```bash
# 1. Setup fresh test data
cd backend
node scripts/setup-full-test-flow.js

# 2. Update test script with new document ID
# Edit test-internal-to-external-flow.js line 61-62

# 3. Run full test
node scripts/test-internal-to-external-flow.js

# 4. Debug if needed
node scripts/debug-approval-creation.js
```

## 📊 Success Criteria

- ✅ All 13 steps pass (100%)
- ✅ Workflow completes successfully
- ✅ External signer signs document
- ✅ Signed PDF downloaded
- ✅ No errors in test output

## 🎯 Estimated Time

- Fix test script: 15 mins
- Fix approver assignment: 30 mins
- Complete remaining steps: 1 hour
- Testing & verification: 15 mins

**Total**: ~2 hours to 100% completion

## 📚 Reference Files

- Test script: `backend/scripts/test-internal-to-external-flow.js`
- Setup script: `backend/scripts/setup-full-test-flow.js`
- Debug script: `backend/scripts/debug-approval-creation.js`
- Schema: `backend/prisma/schema.prisma`
- Approvals service: `backend/src/modules/approvals/approvals.service.ts`

## 💡 Key Insights

1. **Workflow system working** - Instance and approval created successfully
2. **Permission system working** - Manager role has correct permissions
3. **Schema fixed** - `is_internal` field added and working
4. **Test infrastructure solid** - Just needs minor fixes

## 🚀 Ready to Complete!

All major blockers resolved. Next session should achieve 100% test completion with minimal effort.
