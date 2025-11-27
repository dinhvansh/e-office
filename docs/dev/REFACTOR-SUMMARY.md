# Workflow Order Refactor - Quick Summary

## Vấn Đề

Khi tạo document với **customized workflow**, thứ tự logic SAI:
- Workflow được load TRƯỚC khi customized workflow được tạo
- Approvals và signers được tạo từ workflow CŨ
- Signers nhận email NGAY LẬP TỨC thay vì đợi approval

## Giải Pháp

### Thứ Tự Mới (ĐÚNG):

```
1. Tạo document + sign request
2. ✅ XỬ LÝ WORKFLOW TRƯỚC:
   - Nếu có customizedSteps → Tạo customized workflow NGAY
   - Nếu có workflowId → Load workflow đó  
   - Nếu không → Load default workflow
3. ✅ Tạo APPROVALS từ workflow
4. ✅ Tạo SIGNERS với status:
   - Có approvals → status = 'waiting_approval'
   - Không có → status = 'pending'
5. ✅ Khi approval complete:
   - Update signers: 'waiting_approval' → 'pending'
   - Gửi email
```

## Files Đã Sửa

1. **`backend/src/modules/documents/documents.service.ts`**
   - Refactor `createDocument()` method
   - Tạo workflow TRƯỚC approvals/signers
   - Signers có status phụ thuộc vào approvals

2. **`backend/src/modules/approvals/approvals.service.ts`**
   - Update `autoSendSignRequest()` method
   - Activate signers trước khi gửi email

## Signer Status Flow

```
CREATE → waiting_approval → APPROVAL COMPLETE → pending → signed
         (nếu có approvals)                      (gửi email)
         
CREATE → pending → signed
         (không có approvals, gửi email ngay)
```

## Test

Chạy test script:
```bash
node backend/scripts/test-workflow-order-refactor.js
```

## Chi Tiết

Xem: `docs/dev/SESSION-2025-11-27-WORKFLOW-ORDER-REFACTOR.md`
