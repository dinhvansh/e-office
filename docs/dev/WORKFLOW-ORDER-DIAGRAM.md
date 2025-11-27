# Workflow Order - Visual Diagram

## OLD FLOW (BROKEN) ❌

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE DOCUMENT                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE SIGN REQUEST (draft)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. LOAD WORKFLOW                                            │
│    - Load from workflowId or default_workflow_id            │
│    ❌ Customized workflow doesn't exist yet!                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CREATE APPROVALS (from OLD workflow)                    │
│    ❌ Wrong workflow!                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CREATE SIGNERS (status = 'pending')                     │
│    ❌ Wrong workflow!                                        │
│    ❌ Emails sent immediately!                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. CREATE CUSTOMIZED WORKFLOW                               │
│    ❌ Too late! Approvals/signers already created           │
└─────────────────────────────────────────────────────────────┘
```

## NEW FLOW (FIXED) ✅

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE DOCUMENT                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE SIGN REQUEST (draft)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DETERMINE WORKFLOW (Priority Order)                     │
│    ✅ Priority 1: Create customized workflow (if provided)  │
│    ✅ Priority 2: Load specific workflow (if workflowId)    │
│    ✅ Priority 3: Load default workflow                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CREATE APPROVALS (from CORRECT workflow)                │
│    ✅ Workflow exists and is correct                        │
│    - Create workflow instance                               │
│    - Create approvals for ALL steps                         │
│    - Set hasApprovals = true                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CREATE SIGNERS (with appropriate status)                │
│    ✅ status = hasApprovals ? 'waiting_approval' : 'pending'│
│    ✅ No emails sent if waiting_approval                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. APPROVAL PROCESS                                         │
│    User approves → Check if all approvals done              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ALL APPROVALS COMPLETE                                   │
│    ✅ autoSendSignRequest() called:                         │
│       1. Update signers: 'waiting_approval' → 'pending'     │
│       2. Send emails to all signers                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SIGNING PROCESS                                          │
│    Signers receive emails and can sign                      │
└─────────────────────────────────────────────────────────────┘
```

## SIGNER STATUS FLOW

### With Approvals:
```
CREATE DOCUMENT
    ↓
[waiting_approval] ← Signer created, no email sent
    ↓
APPROVAL PROCESS
    ↓
All approvals complete
    ↓
[pending] ← Status updated, email sent
    ↓
External: [otp_sent] → [signed]
Internal: [signed]
```

### Without Approvals:
```
CREATE DOCUMENT
    ↓
[pending] ← Signer created, email sent immediately
    ↓
External: [otp_sent] → [signed]
Internal: [signed]
```

## WORKFLOW PRIORITY

```
Input has customizedSteps?
    ↓ YES
┌─────────────────────────────────────┐
│ CREATE CUSTOMIZED WORKFLOW          │
│ - Based on template                 │
│ - Specific to this document         │
│ - is_template = false               │
└─────────────────────────────────────┘
    ↓
    USE THIS WORKFLOW
    
    ↓ NO
Input has workflowId?
    ↓ YES
┌─────────────────────────────────────┐
│ LOAD SPECIFIC WORKFLOW              │
│ - User selected workflow            │
└─────────────────────────────────────┘
    ↓
    USE THIS WORKFLOW
    
    ↓ NO
Document type has default_workflow_id?
    ↓ YES
┌─────────────────────────────────────┐
│ LOAD DEFAULT WORKFLOW               │
│ - From document type config         │
└─────────────────────────────────────┘
    ↓
    USE THIS WORKFLOW
    
    ↓ NO
┌─────────────────────────────────────┐
│ NO WORKFLOW                         │
│ - Skip approval/workflow steps      │
└─────────────────────────────────────┘
```

## KEY DIFFERENCES

| Aspect | OLD (Broken) | NEW (Fixed) |
|--------|-------------|-------------|
| Workflow Creation | After approvals/signers | **BEFORE** approvals/signers |
| Customized Workflow | Created too late | Created **FIRST** |
| Approvals | From wrong workflow | From **correct** workflow |
| Signer Status | Always 'pending' | **'waiting_approval'** if has approvals |
| Email Timing | Sent immediately | Sent **after approvals** |
| Business Logic | Violated | **Enforced** |

## BENEFITS

✅ **Correct Workflow Processing**
- Customized workflows created at the right time
- Approvals use the correct workflow
- Signers use the correct workflow

✅ **Proper Email Timing**
- No premature notifications
- Signers notified only after approvals
- Business logic enforced

✅ **Clear Status Management**
- 'waiting_approval' = blocked by approvals
- 'pending' = ready to sign
- Status transitions are explicit

✅ **Better Logging**
- Each step logged clearly
- Easy to debug issues
- Audit trail complete
