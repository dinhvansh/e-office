# Lessons Learned - Bài học từ các lỗi đã fix

> **Mục đích**: Document tất cả các lỗi/issue đã gặp và cách fix để tránh lặp lại trong tương lai.

## 📋 Quy tắc Document

### Khi nào cần viết?
- ✅ Sau khi fix bất kỳ bug/issue nào
- ✅ Sau khi giải quyết vấn đề phức tạp
- ✅ Sau khi refactor code quan trọng
- ✅ Khi phát hiện pattern lỗi lặp lại

### Format chuẩn
```markdown
## [YYYY-MM-DD] Tên lỗi ngắn gọn

**Loại**: Bug/Issue/Refactor/Performance
**Mức độ**: Critical/High/Medium/Low
**Module**: Tên module bị ảnh hưởng

### Vấn đề
Mô tả chi tiết vấn đề gặp phải

### Root Cause
Nguyên nhân gốc rễ của vấn đề

### Solution
Cách fix đã áp dụng

### Prevention
Cách ngăn chặn lỗi tương tự trong tương lai

### Files Changed
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Related Issues
- Link đến issue/PR nếu có
```

---

## 📚 Danh sách Lessons Learned

### [2025-11-28] Workflow Order - Signing Order Conflict

**Loại**: Bug - Logic Error  
**Mức độ**: High  
**Module**: Workflows, Sign Requests

#### Vấn đề
- Workflow steps có `step_order` (1, 2, 3...)
- Signers có `signing_order` (1, 2, 3...)
- Khi combine → Conflict: Approver order 1 vs Signer order 1
- User không biết ai ký trước

#### Root Cause
- 2 hệ thống độc lập (Approval vs Signing)
- Không có unified ordering system
- Frontend hiển thị 2 order riêng biệt gây confusion

#### Solution
1. Thêm `participant_role` field vào `workflow_steps`
   - Values: 'approver' | 'signer'
2. Workflow steps bao gồm CẢ approvers VÀ signers
3. `step_order` là unified order cho tất cả participants
4. Frontend chỉ hiển thị 1 timeline duy nhất

#### Prevention
- ✅ Luôn nghĩ về unified UX khi có 2 hệ thống
- ✅ Tránh duplicate ordering fields
- ✅ Document rõ ràng relationship giữa các entities
- ✅ Test với real user flow, không chỉ technical flow

#### Files Changed
- `backend/prisma/schema.prisma` - Added participant_role
- `backend/src/modules/documents/documents.service.ts` - Unified order logic
- `frontend/components/workflow/*` - Display unified timeline

#### Related Issues
- `docs/dev/ISSUE-CUSTOMIZED-WORKFLOW-ORDER.md`
- `docs/dev/SOLUTION-WORKFLOW-PARTICIPANT-ROLE.md`

---

### [2025-11-27] OTP Expiry - Poor Error Handling

**Loại**: Bug - UX Issue  
**Mức độ**: Medium  
**Module**: Public Signing

#### Vấn đề
- OTP hết hạn sau 10 phút
- User nhập OTP cũ → Generic error "Invalid OTP"
- Không biết OTP đã hết hạn hay nhập sai

#### Root Cause
- Backend chỉ check `otp_hash` match
- Không check `otp_expire` timestamp
- Error message không specific

#### Solution
1. Check OTP expiry TRƯỚC khi check hash
2. Return specific error: "OTP đã hết hạn"
3. Frontend hiển thị button "Gửi lại OTP"
4. Add timestamp display: "OTP hết hạn sau X phút"

#### Prevention
- ✅ Luôn check expiry/validity trước khi check value
- ✅ Error messages phải specific và actionable
- ✅ Provide clear next steps cho user
- ✅ Display countdown/expiry time

#### Files Changed
- `backend/src/modules/public/publicSign.controller.ts`
- `frontend/app/sign/[token]/page.tsx`

#### Related Issues
- `docs/dev/FIX-OTP-EXPIRY-ERROR-HANDLING.md`

---

### [2025-11-27] Premature Email Sending

**Loại**: Bug - Timing Issue  
**Mức độ**: High  
**Module**: Sign Requests, Email Service

#### Vấn đề
- Email gửi cho signer TRƯỚC KHI admin add fields
- Signer click link → Không có field nào để ký
- Phải resend email sau khi add fields

#### Root Cause
- `/send` endpoint gửi email ngay lập tức
- Không check xem đã có fields chưa
- Workflow: Upload → Send → Add fields (SAI!)

#### Solution
1. Đổi workflow: Upload → Add fields → Send
2. `/send` endpoint check: Must have at least 1 field
3. Frontend: Disable "Send" button nếu chưa có fields
4. Add validation message rõ ràng

#### Prevention
- ✅ Validate prerequisites trước khi execute action
- ✅ Disable buttons khi chưa đủ điều kiện
- ✅ Show clear validation messages
- ✅ Test complete user flow, không chỉ happy path

#### Files Changed
- `backend/src/modules/signRequests/signRequests.service.ts`
- `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx`

#### Related Issues
- `docs/dev/FIX-PREMATURE-EMAIL-SENDING.md`

---

### [2025-11-26] Dropdown Overflow Hidden

**Loại**: Bug - CSS Issue  
**Mức độ**: Medium  
**Module**: UI Components

#### Vấn đề
- Dropdown bị che bởi parent `overflow: hidden`
- Z-index không giải quyết được
- User không thấy options

#### Root Cause
- Parent container có `overflow: hidden`
- Dropdown render TRONG parent DOM
- CSS stacking context bị limit

#### Solution
- Dùng React Portal: `createPortal(dropdown, document.body)`
- Render dropdown RA NGOÀI parent DOM
- Calculate position dynamically với `getBoundingClientRect()`
- Position: `fixed` với calculated top/left

#### Prevention
- ✅ Dùng Portal cho tất cả dropdown/modal/tooltip
- ✅ Tránh rely vào z-index khi có overflow:hidden
- ✅ Test UI trong các container khác nhau
- ✅ Use library components (Radix UI) đã handle sẵn

#### Files Changed
- `frontend/components/ui/searchable-select.tsx`

---

### [2025-11-26] Field Position - Pixel vs Percentage

**Loại**: Bug - Data Format Issue  
**Mức độ**: Critical  
**Module**: PDF Editor, Signing

#### Vấn đề
- Editor lưu field position bằng PIXEL (500px, 300px)
- Signing page render PDF với size khác
- Fields không đúng vị trí (off-screen hoặc sai chỗ)

#### Root Cause
- Không nghĩ về responsive/different screen sizes
- Hardcode pixel values
- Không convert sang relative units

#### Solution
1. Lưu position bằng PERCENTAGE (0-100%)
2. Convert khi save: `(pixel / canvasSize) * 100`
3. Convert khi render: `(percentage / 100) * canvasSize`
4. Migration script để fix old data

#### Prevention
- ✅ Luôn dùng relative units cho position/size
- ✅ Test trên nhiều screen sizes
- ✅ Document data format rõ ràng
- ✅ Add validation cho data format

#### Files Changed
- `frontend/components/pdf/PDFCanvasViewer.tsx`
- `backend/scripts/convert-fields-to-percentage.js`

---

### [2025-11-24] React Hook - Wrong Usage

**Loại**: Bug - React Pattern  
**Mức độ**: High  
**Module**: ManageSignersDialog

#### Vấn đề
- Drag & drop không hoạt động
- Component re-render incorrectly
- State không sync với props

#### Root Cause
```typescript
// ❌ WRONG - useState cannot be called like this
useState(() => {
  setLocalSigners(signers);
});
```

#### Solution
```typescript
// ✅ CORRECT - Use useEffect
React.useEffect(() => {
  setLocalSigners(signers);
}, [signers]);
```

#### Prevention
- ✅ Hiểu rõ React Hooks lifecycle
- ✅ useState chỉ dùng để init state
- ✅ useEffect dùng để sync với props/external data
- ✅ ESLint rules cho React Hooks

#### Files Changed
- `frontend/components/sign-requests/ManageSignersDialog.tsx`

---

### [2025-11-22] Prisma Relation Syntax

**Loại**: Bug - Database ORM  
**Mức độ**: High  
**Module**: Multiple modules

#### Vấn đề
- Error: "Unknown argument `user_id`. Did you mean `user`?"
- Cannot create signers with user relation

#### Root Cause
```typescript
// ❌ WRONG - Direct field assignment
await prisma.signers.create({
  data: {
    user_id: 123  // Error!
  }
});
```

#### Solution
```typescript
// ✅ CORRECT - Use relation syntax
await prisma.signers.create({
  data: {
    user: { connect: { id: 123 } }
  }
});
```

#### Prevention
- ✅ Luôn check Prisma schema trước khi query
- ✅ Dùng relation syntax cho foreign keys
- ✅ Test database operations với real data
- ✅ Read Prisma docs carefully

#### Files Changed
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/documents/documents.service.ts`

---

## 📊 Statistics

**Total Lessons**: 7  
**Critical**: 1  
**High**: 4  
**Medium**: 2  
**Low**: 0  

**Top Categories**:
1. Logic Errors: 3
2. UX Issues: 2
3. Data Format: 1
4. React Patterns: 1

---

## 🎯 Key Takeaways

### Always Do
1. ✅ Validate prerequisites before actions
2. ✅ Use relative units (%, not px)
3. ✅ Check expiry/validity before value
4. ✅ Test complete user flows
5. ✅ Document data formats clearly

### Never Do
1. ❌ Hardcode pixel values for positions
2. ❌ Generic error messages
3. ❌ Duplicate ordering systems
4. ❌ Wrong React Hook usage
5. ❌ Direct foreign key assignment in Prisma

### Best Practices
1. 🎯 Think about unified UX
2. 🎯 Provide actionable error messages
3. 🎯 Use Portal for dropdowns/modals
4. 🎯 Test on different screen sizes
5. 🎯 Read ORM docs carefully

---

**Last Updated**: 2025-11-28  
**Maintained By**: Development Team
