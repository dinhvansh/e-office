# Workflow Refactor - Test Checklist

## Pre-Test Setup

- [ ] Backend server running
- [ ] Database seeded with test data
- [ ] At least 2 users in system
- [ ] Document type with `require_approval = true` and `require_digital_signing = true`
- [ ] Default workflow configured for document type

## Test Scenario 1: Customized Workflow with Approvals

### Setup
- [ ] Login as User A
- [ ] Navigate to create document page
- [ ] Select document type that requires approval + signing

### Steps
1. [ ] Upload a document
2. [ ] Enable "Customize Workflow"
3. [ ] Add 2 steps:
   - Step 1: User B as Approver
   - Step 2: User C as Signer
4. [ ] Submit document

### Expected Results
- [ ] Document created successfully
- [ ] Check database: Customized workflow created
- [ ] Check database: Workflow has 2 steps
- [ ] Check database: Approval created for User B
- [ ] Check database: Signer created for User C with `status = 'waiting_approval'`
- [ ] User C does NOT receive email yet
- [ ] Document status = 'pending_approval'

### Approval Process
5. [ ] Login as User B
6. [ ] Navigate to approvals page
7. [ ] Approve the document

### Expected Results After Approval
- [ ] Approval status = 'approved'
- [ ] Signer status changed to 'pending'
- [ ] User C receives email notification
- [ ] Document status = 'pending_signature'

### Signing Process
8. [ ] Login as User C
9. [ ] Navigate to signing page
10. [ ] Sign the document

### Expected Results After Signing
- [ ] Signer status = 'signed'
- [ ] Document status = 'completed'

## Test Scenario 2: Default Workflow with Approvals

### Setup
- [ ] Login as User A
- [ ] Navigate to create document page
- [ ] Select document type with default workflow

### Steps
1. [ ] Upload a document
2. [ ] Do NOT customize workflow (use default)
3. [ ] Submit document

### Expected Results
- [ ] Document created successfully
- [ ] Check database: Default workflow used (not customized)
- [ ] Check database: Approvals created for all workflow steps
- [ ] Check database: Signers created with `status = 'waiting_approval'`
- [ ] No emails sent to signers yet
- [ ] Document status = 'pending_approval'

### Approval Process
4. [ ] Complete all approvals in order

### Expected Results After All Approvals
- [ ] All approval statuses = 'approved'
- [ ] All signer statuses changed to 'pending'
- [ ] All signers receive email notifications
- [ ] Document status = 'pending_signature'

## Test Scenario 3: No Approvals (Direct Signing)

### Setup
- [ ] Login as User A
- [ ] Navigate to create document page
- [ ] Select document type with `require_approval = false` but `require_digital_signing = true`

### Steps
1. [ ] Upload a document
2. [ ] Add signers manually
3. [ ] Submit document

### Expected Results
- [ ] Document created successfully
- [ ] Check database: No workflow instance created
- [ ] Check database: No approvals created
- [ ] Check database: Signers created with `status = 'pending'`
- [ ] Signers receive email notifications IMMEDIATELY
- [ ] Document status = 'draft' or 'pending_signature'

## Test Scenario 4: Workflow Order Verification

### Using Test Script
1. [ ] Run test script:
   ```bash
   node backend/scripts/test-workflow-order-refactor.js
   ```

### Expected Output
- [ ] Script shows customized workflows
- [ ] Script shows workflow created BEFORE approvals
- [ ] Script shows signers with correct status
- [ ] No errors in output

### Manual Database Check
2. [ ] Find a document with customized workflow
3. [ ] Check timestamps:
   ```sql
   SELECT 
     w.id as workflow_id,
     w.created_at as workflow_created,
     da.id as approval_id,
     da.created_at as approval_created,
     s.id as signer_id,
     s.status as signer_status
   FROM workflows w
   LEFT JOIN document_approvals da ON da.workflow_id = w.id
   LEFT JOIN documents d ON d.id = w.created_for_doc
   LEFT JOIN sign_requests sr ON sr.document_id = d.id
   LEFT JOIN signers s ON s.sign_request_id = sr.id
   WHERE w.is_template = false
   ORDER BY w.created_at DESC
   LIMIT 1;
   ```

### Expected Results
- [ ] `workflow_created` <= `approval_created` (workflow created first)
- [ ] `signer_status` = 'waiting_approval' if approvals exist
- [ ] `signer_status` = 'pending' if no approvals

## Test Scenario 5: Email Timing

### Setup
- [ ] Enable email logging in backend
- [ ] Create document with customized workflow + approvals

### Steps
1. [ ] Create document with 1 approval step + 1 signer
2. [ ] Check email logs

### Expected Results
- [ ] Approval notification sent to approver
- [ ] NO signing notification sent to signer yet

### After Approval
3. [ ] Approve the document
4. [ ] Check email logs

### Expected Results
- [ ] Signing notification NOW sent to signer
- [ ] Email contains signing link and OTP (for external)

## Test Scenario 6: Multiple Signers

### Setup
- [ ] Create document with customized workflow
- [ ] Add 2 approval steps
- [ ] Add 3 signers

### Steps
1. [ ] Submit document
2. [ ] Check all signer statuses

### Expected Results
- [ ] All 3 signers have `status = 'waiting_approval'`
- [ ] No emails sent yet

### After All Approvals
3. [ ] Complete both approval steps
4. [ ] Check all signer statuses

### Expected Results
- [ ] All 3 signers have `status = 'pending'`
- [ ] All 3 signers received emails

## Test Scenario 7: Rejection Handling

### Setup
- [ ] Create document with approvals + signers

### Steps
1. [ ] Submit document
2. [ ] Reject at approval stage

### Expected Results
- [ ] Document status = 'rejected'
- [ ] Signers remain `status = 'waiting_approval'`
- [ ] No emails sent to signers
- [ ] Workflow instance status = 'rejected'

## Logging Verification

### Check Console Logs
Look for these log messages:

- [ ] `[Workflow] Creating customized workflow with X steps`
- [ ] `[Workflow] Customized workflow created: ID X`
- [ ] `[Workflow Instance] Creating workflow instance for document X`
- [ ] `[Workflow Step X] Created approval for user X`
- [ ] `[Signers] Signer status will be: waiting_approval (hasApprovals: true)`
- [ ] `[Auto-Send] Activating signers for sign request X`
- [ ] `[Auto-Send] Found X signers waiting for approval`
- [ ] `[Auto-Send] Activated signer: email@example.com`

## Performance Check

- [ ] Document creation time < 2 seconds
- [ ] Approval process time < 1 second
- [ ] Signer activation time < 1 second
- [ ] No database deadlocks
- [ ] No race conditions

## Edge Cases

### Empty Workflow
- [ ] Create document with workflow but no steps
- [ ] Should handle gracefully

### Missing Approver
- [ ] Create workflow step with invalid approver_id
- [ ] Should show error or skip step

### Duplicate Signers
- [ ] Add same signer twice
- [ ] Should handle gracefully

### Concurrent Approvals
- [ ] Two approvers approve at same time
- [ ] Should handle race condition

## Rollback Test

### If Issues Found
1. [ ] Document the issue
2. [ ] Check git history
3. [ ] Identify problematic commit
4. [ ] Revert if necessary

## Sign-off

- [ ] All test scenarios passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Logging working correctly
- [ ] Ready for production

**Tested by:** _______________  
**Date:** _______________  
**Notes:** _______________
