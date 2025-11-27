# Test: Fix Internal Signers Select Box

## Vấn đề đã sửa
Box chọn người phê duyệt và người ký internal không thay đổi được giá trị

## Root Cause
1. **InternalSignersSelector**: 
   - Select value không handle đúng khi `user_id = 0` hoặc `undefined`
   - Console.log dư thừa gây nhiễu
   
2. **WorkflowCustomizer**:
   - SearchableSelect không convert value type đúng (string vs number)
   
3. **Create Page**:
   - Mapping internal signers từ workflow sai field (`id` thay vì `user_id`)
   - Role mapping không đúng

## Các thay đổi đã thực hiện

### 1. InternalSignersSelector.tsx
```typescript
// ✅ Fixed: Simplified handleUpdateSigner
const handleUpdateSigner = (index: number, field: keyof InternalSigner, value: any) => {
  const newSigners = [...signers];
  
  if (field === 'user_id') {
    const userId = parseInt(value);
    newSigners[index] = { 
      ...newSigners[index], 
      user_id: userId 
    };
    
    // Update name and email from selected user
    const user = users?.find((u: any) => u.id === userId);
    if (user) {
      newSigners[index].name = user.full_name || user.email;
      newSigners[index].email = user.email;
    }
  } else {
    newSigners[index] = { 
      ...newSigners[index], 
      [field]: value 
    };
  }
  
  onChange(newSigners);
};

// ✅ Fixed: Select value handling
<Select
  value={signer.user_id && signer.user_id > 0 ? signer.user_id.toString() : undefined}
  onValueChange={(value) => handleUpdateSigner(index, 'user_id', value)}
>
```

### 2. WorkflowCustomizer.tsx
```typescript
// ✅ Fixed: Type conversion in onChange
<SearchableSelect
  value={step.approver_id || ''}
  onChange={(value) => handleUpdateStep(index, 'approver_id', typeof value === 'string' ? parseInt(value) : value)}
/>
```

### 3. Create Page
```typescript
// ✅ Fixed: Correct field mapping
const internalSignersList: InternalSigner[] = signerSteps.map((step: any, index: number) => ({
  user_id: step.approver_id || 0,  // ✅ Was: id: step.id
  name: step.approver_name || step.approver_email || 'Unknown',
  email: step.approver_email || '',
  signing_order: index + 1,
  role: (step.participant_role === 'approver' ? 'approver' : 'signer') as 'signer' | 'approver',  // ✅ Was: step.step_name
}));

// ✅ Added: Debug logging
<InternalSignersSelector
  signers={internalSigners}
  onChange={(newSigners) => {
    console.log('📝 InternalSigners onChange:', newSigners);
    setInternalSigners(newSigners);
  }}
  allowEdit={workflowMode === 'flexible' || workflowMode === 'adhoc'}
/>
```

## Test Steps

### Test 1: InternalSignersSelector trong Create Page
1. Mở: http://localhost:3000/sign-requests/create
2. Upload file PDF
3. Chọn loại văn bản: "Hợp đồng" (có workflow)
4. Scroll xuống phần "Người ký nội bộ"
5. Click "Thêm người ký nội bộ"
6. **Test**: Chọn user từ dropdown
7. **Expected**: 
   - ✅ Dropdown hiển thị user đã chọn
   - ✅ Name và email tự động điền
   - ✅ Console log: "📝 InternalSigners onChange: [...]"

### Test 2: WorkflowCustomizer trong Create Page
1. Ở bước 2 (Workflow)
2. Chọn "Tùy chỉnh" (Flexible mode)
3. Click "Thêm bước"
4. **Test**: Chọn người phê duyệt từ SearchableSelect
5. **Expected**:
   - ✅ Dropdown hiển thị user đã chọn
   - ✅ Có thể search và chọn user khác
   - ✅ Value được lưu đúng

### Test 3: Drag & Drop Reorder
1. Thêm 3 người ký nội bộ
2. **Test**: Kéo thả để đổi thứ tự
3. **Expected**:
   - ✅ Thứ tự thay đổi
   - ✅ Signing order tự động update (1, 2, 3)

### Test 4: Role Selection
1. Thêm người ký nội bộ
2. Chọn user
3. **Test**: Đổi role từ "Người ký" → "Người phê duyệt"
4. **Expected**:
   - ✅ Role thay đổi
   - ✅ Badge màu thay đổi (purple → blue)

## Verification Checklist

- [ ] Select box hiển thị đúng giá trị đã chọn
- [ ] Có thể chọn user khác và value update
- [ ] Name và email tự động điền sau khi chọn user
- [ ] Role selection hoạt động
- [ ] Drag & drop reorder hoạt động
- [ ] Console logs hiển thị đúng data
- [ ] Không có lỗi TypeScript
- [ ] Không có lỗi runtime trong console

## Expected Console Logs

Khi chọn user, bạn sẽ thấy:
```
📝 InternalSigners onChange: [
  {
    user_id: 17,
    name: "Người phê duyệt",
    email: "approver@acme.local",
    signing_order: 1,
    role: "signer"
  }
]
```

## Files Changed
- ✅ `frontend/components/documents/InternalSignersSelector.tsx`
- ✅ `frontend/components/workflow/WorkflowCustomizer.tsx`
- ✅ `frontend/app/(dashboard)/sign-requests/create/page.tsx`

## Status
✅ **FIXED** - Ready for testing
