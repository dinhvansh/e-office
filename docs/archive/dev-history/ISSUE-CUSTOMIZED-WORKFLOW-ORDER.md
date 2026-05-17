# Issue: Customized Workflow Logic Order Problem

**Date:** 2025-11-27  
**Status:** ✅ RESOLVED - Refactoring Completed  
**Priority:** High  
**Resolution:** See `SESSION-2025-11-27-WORKFLOW-ORDER-REFACTOR.md`

## Problem Summary

Khi tạo sign request với customized workflow, các approvals không được tạo và signers nhận email ngay lập tức thay vì đợi approval hoàn thành. Nguyên nhân là **thứ tự thực hiện logic sai**.

## Current Flow (Broken)

```
1. Tạo document
2. Tạo sign request  
3. Load workflow (từ workflowId hoặc default_workflow_id)
   ❌ Customized workflow chưa tồn tại ở bước này!
4. Tạo signers từ workflow đã load
5. SAU ĐÓ mới tạo customized workflow
6. Tạo approvals (nhưng không chạy vì workflow đã được xử lý ở bước 3)
```

## Root Cause

File: `backend/src/modules/signRequests/signRequests.service.ts`

```typescript
// Bước 3: Load workflow
const workflow = input.workflowId 
  ? await this.workflowsRepository.findById(input.workflowId)
  : await this.workflowsRepository.findById(document.document_type.default_workflow_id);

// Bước 4: Tạo signers từ workflow
if (workflow) {
  // Process workflow steps...
}

// Bước 5: SAU ĐÓ mới tạo customized workflow
if (input.customizedWorkflow) {
  const customWorkflow = await this.createCustomizedWorkflow(...);
  // ❌ Quá muộn! Workflow đã được xử lý ở trên
}
```

## Impact

### 1. Customized Workflow Approvals Không Được Tạo
- Workflow được load ở bước 3 (trước khi customized workflow được tạo)
- Khi tạo customized workflow ở bước 5, approvals không được tạo vì workflow processing đã xong
- Kết quả: Document bỏ qua approval flow hoàn toàn

### 2. Signers Nhận Email Ngay Lập Tức
- Signers được tạo ở bước 4 với status = 'pending'
- Email được gửi ngay trong quá trình tạo signer
- Không đợi approvals hoàn thành trước
- Vi phạm business logic: phải approve trước khi sign

## Required Fix

### New Flow (Correct)

```
1. Tạo document
2. Tạo sign request (chỉ metadata, chưa tạo signers)
3. XỬ LÝ WORKFLOW TRƯỚC:
   a. Nếu có customizedWorkflow → Tạo customized workflow NGAY
   b. Nếu có workflowId → Load workflow đó
   c. Nếu không → Load default workflow
4. Tạo APPROVALS từ workflow (nếu có workflow steps)
5. CHỈ SAU KHI APPROVALS XONG → Tạo signers
6. Signers ban đầu có status = 'waiting_approval' (không phải 'pending')
7. Khi approval cuối cùng complete → Update signers thành 'pending' và gửi email
```

## Files Need to Modify

### 1. `backend/src/modules/signRequests/signRequests.service.ts`

**Method:** `createSignRequest()`

**Changes:**
- Move customized workflow creation BEFORE workflow processing
- Separate signer creation logic
- Add status management for signers based on approval state

### 2. `backend/src/modules/approvals/approvals.service.ts`

**Method:** `approve()` hoặc `completeApproval()`

**Changes:**
- Khi approval cuối cùng complete, trigger signer activation
- Update all signers từ 'waiting_approval' → 'pending'
- Gửi email notification cho signers

### 3. `backend/src/modules/signers/signers.service.ts`

**Method:** `createSigner()`

**Changes:**
- Thêm logic check: nếu có pending approvals → status = 'waiting_approval'
- Không gửi email nếu status = 'waiting_approval'

**New Method:** `activateSigners(signRequestId)`
- Update tất cả signers của sign request thành 'pending'
- Gửi email cho tất cả signers

## Detailed Refactoring Plan

### Step 1: Refactor `createSignRequest()`

```typescript
async createSignRequest(input, userId, tenantId) {
  // 1. Create document
  const document = await this.documentsService.create(...);
  
  // 2. Create sign request (metadata only)
  const signRequest = await this.signRequestsRepository.create({
    document_id: document.id,
    status: 'draft',
    // ... other fields
  });
  
  // 3. HANDLE WORKFLOW FIRST
  let workflow = null;
  let hasApprovals = false;
  
  if (input.customizedWorkflow) {
    // Create customized workflow IMMEDIATELY
    workflow = await this.createCustomizedWorkflow(
      signRequest.id,
      input.customizedWorkflow,
      tenantId
    );
    hasApprovals = workflow.steps.length > 0;
  } else if (input.workflowId) {
    workflow = await this.workflowsRepository.findById(input.workflowId);
    hasApprovals = workflow?.steps.length > 0;
  } else if (document.document_type.default_workflow_id) {
    workflow = await this.workflowsRepository.findById(
      document.document_type.default_workflow_id
    );
    hasApprovals = workflow?.steps.length > 0;
  }
  
  // 4. Create approvals if workflow exists
  if (workflow && hasApprovals) {
    await this.createApprovalsFromWorkflow(signRequest.id, workflow, tenantId);
  }
  
  // 5. Create signers with appropriate status
  const signerStatus = hasApprovals ? 'waiting_approval' : 'pending';
  
  if (input.internalSigners) {
    for (const signer of input.internalSigners) {
      await this.signersService.createSigner({
        ...signer,
        sign_request_id: signRequest.id,
        status: signerStatus,
        send_email: !hasApprovals // Only send if no approvals
      });
    }
  }
  
  if (input.externalSigners) {
    for (const signer of input.externalSigners) {
      await this.signersService.createSigner({
        ...signer,
        sign_request_id: signRequest.id,
        status: signerStatus,
        send_email: !hasApprovals
      });
    }
  }
  
  return signRequest;
}
```

### Step 2: Update `approvals.service.ts`

```typescript
async completeApproval(approvalId, userId, tenantId) {
  const approval = await this.approvalsRepository.findById(approvalId);
  
  // Mark as approved
  await this.approvalsRepository.update(approvalId, {
    status: 'approved',
    approved_at: new Date(),
    approved_by: userId
  });
  
  // Check if this is the last approval
  const allApprovals = await this.approvalsRepository.findBySignRequest(
    approval.sign_request_id
  );
  
  const allApproved = allApprovals.every(a => a.status === 'approved');
  
  if (allApproved) {
    // All approvals done → Activate signers
    await this.signersService.activateSigners(approval.sign_request_id);
  }
}
```

### Step 3: Update `signers.service.ts`

```typescript
async createSigner(input) {
  const signer = await this.signersRepository.create({
    ...input,
    status: input.status || 'pending'
  });
  
  // Only send email if status is 'pending' (not 'waiting_approval')
  if (input.send_email && signer.status === 'pending') {
    await this.emailService.sendSigningInvitation(signer);
  }
  
  return signer;
}

async activateSigners(signRequestId) {
  // Get all signers waiting for approval
  const signers = await this.signersRepository.findBySignRequest(signRequestId);
  const waitingSigners = signers.filter(s => s.status === 'waiting_approval');
  
  // Update status and send emails
  for (const signer of waitingSigners) {
    await this.signersRepository.update(signer.id, {
      status: 'pending'
    });
    
    await this.emailService.sendSigningInvitation(signer);
  }
}
```

## Testing Checklist

After refactoring, test these scenarios:

- [ ] Create sign request with customized workflow
  - [ ] Approvals are created correctly
  - [ ] Signers have status 'waiting_approval'
  - [ ] No emails sent to signers initially
  
- [ ] Complete all approvals
  - [ ] Signers status changes to 'pending'
  - [ ] Emails sent to all signers
  
- [ ] Create sign request without workflow
  - [ ] No approvals created
  - [ ] Signers have status 'pending' immediately
  - [ ] Emails sent immediately

- [ ] Create sign request with existing workflow
  - [ ] Approvals created from workflow steps
  - [ ] Signers wait for approval
  - [ ] Emails sent after approval

## Related Issues

- ✅ Fixed workflow selection dropdown
- ✅ Fixed field mismatch (order vs signing_order)
- ✅ Added signing order inputs
- ✅ Fixed approval creation for all steps
- ✅ Fixed department approval auto-assignment
- ✅ Fixed customized workflow return value
- ❌ **THIS ISSUE:** Workflow/approval/signer creation order
- ❌ **THIS ISSUE:** Premature email sending to signers

## Session History

- **Session 2025-11-22:** Workflow integration completed
- **Session 2025-11-27:** Discovered logic order issue
- **Next Session:** Implement refactoring plan

---

**Note:** This is a critical architectural issue that affects the core business logic. Must be fixed before production deployment.
