# 🚀 Session Tiếp Theo: SignNow-Style Signing Experience

**Date**: 2025-11-24  
**Estimated Time**: 2-3 hours  
**Priority**: High  
**Status**: 📋 Ready to Implement

## 🎯 Mục Tiêu

Implement signing experience giống SignNow/DocuSign với:
1. ✅ Ký trực tiếp trên PDF (không modal riêng)
2. ✅ Guided flow với button "Start"
3. ✅ Auto scroll đến từng field
4. ✅ Progress indicator
5. ✅ Chỉ thấy vị trí ký của mình

## 📋 Requirements Chi Tiết

### 1. Vị Trí Ký Từ Editor
- ✅ **Đã có**: Người tạo document đánh dấu vị trí trong editor
- ✅ **Đã có**: Fields lưu trong `sign_request_fields` table
- ✅ **Đã có**: Mỗi field có `assigned_signer_id`

### 2. Chỉ Thấy Vị Trí Của Mình
- ✅ **Đã có**: Filter fields theo `assigned_signer_id`
- ✅ **Đã có**: Backend trả về đúng fields cho signer
- ⚠️ **Cần improve**: Hiển thị rõ hơn trên UI

### 3. Ký Trực Tiếp Trên PDF ⭐ NEW
**Current**: Click field → Modal → Ký → Close modal → Signature hiển thị
**Target**: Click field → Ký ngay trong field box (như SignNow)

**Implementation**:
- Click field → Field expand thành signature canvas
- Vẽ chữ ký trực tiếp trong field
- Button "Clear" và "Done" trong field
- Sau khi Done → Field collapse, hiển thị signature

### 4. Guided Flow với Button "Start" ⭐ NEW
**Flow**:
```
1. User mở signing page
2. Thấy PDF với các field (màu vàng)
3. Click button "Start Signing" (lớn, nổi bật)
4. Auto scroll đến field đầu tiên
5. Field highlight (pulse animation)
6. User ký field 1
7. Auto scroll đến field 2
8. Repeat cho tất cả fields
9. Sau field cuối → Button "Finish" xuất hiện
10. Click Finish → Submit signature
```

### 5. Progress Indicator ⭐ NEW
**UI**:
```
┌─────────────────────────────────────┐
│  Signing Progress: 2 / 5 fields     │
│  ████████░░░░░░░░░░░░░░░░░░░░  40%  │
└─────────────────────────────────────┘
```

**Features**:
- Show current field / total fields
- Progress bar
- Field names list with checkmarks
- Sticky header (always visible)

## 🏗️ Implementation Plan

### Phase 1: In-Field Signing (1 hour)

#### 1.1 Update PDFSigningViewer Component
**File**: `frontend/components/pdf/PDFSigningViewer.tsx`

**Changes**:
- Add state: `activeFieldId` (field đang được ký)
- When field clicked → Set activeFieldId
- Render signature canvas inside field box
- Add "Clear" and "Done" buttons
- After Done → Save signature, clear activeFieldId

**Code Structure**:
```tsx
{field.id === activeFieldId ? (
  // Signature canvas mode
  <div className="absolute inset-0 bg-white p-2">
    <SignatureCanvas ref={canvasRef} />
    <div className="flex gap-2 mt-2">
      <Button onClick={handleClear}>Clear</Button>
      <Button onClick={handleDone}>Done</Button>
    </div>
  </div>
) : (
  // Normal field display
  <div onClick={() => setActiveFieldId(field.id)}>
    {signature ? <img src={signature} /> : 'Click to sign'}
  </div>
)}
```

#### 1.2 Update SignatureCanvas
**File**: `frontend/components/signature/SignatureCanvas.tsx`

**Changes**:
- Support dynamic size (fit field box)
- Add prop: `width`, `height`
- Responsive to container size

### Phase 2: Guided Flow (1 hour)

#### 2.1 Add Guided Flow State
**File**: `frontend/app/sign/[token]/page.tsx`

**State**:
```tsx
const [guidedMode, setGuidedMode] = useState(false);
const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
const [completedFields, setCompletedFields] = useState<number[]>([]);
```

#### 2.2 Start Button
**UI**:
```tsx
{!guidedMode && (
  <div className="fixed bottom-8 right-8">
    <Button 
      size="lg" 
      onClick={handleStartGuided}
      className="bg-blue-600 text-white px-8 py-4 text-lg shadow-lg"
    >
      🚀 Start Signing
    </Button>
  </div>
)}
```

#### 2.3 Auto Scroll Logic
```tsx
const handleStartGuided = () => {
  setGuidedMode(true);
  scrollToField(0);
};

const scrollToField = (index: number) => {
  const field = myFields[index];
  const element = document.getElementById(`field-${field.id}`);
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Highlight field
  setActiveFieldId(field.id);
};

const handleFieldComplete = () => {
  setCompletedFields([...completedFields, activeFieldId]);
  
  if (currentFieldIndex < myFields.length - 1) {
    // Next field
    setCurrentFieldIndex(currentFieldIndex + 1);
    scrollToField(currentFieldIndex + 1);
  } else {
    // All done
    setGuidedMode(false);
    showFinishButton();
  }
};
```

### Phase 3: Progress Indicator (30 mins)

#### 3.1 Progress Header Component
**File**: `frontend/components/signing/ProgressHeader.tsx`

```tsx
interface ProgressHeaderProps {
  currentIndex: number;
  totalFields: number;
  fields: SignatureField[];
  completedFields: number[];
}

export default function ProgressHeader({
  currentIndex,
  totalFields,
  fields,
  completedFields,
}: ProgressHeaderProps) {
  const progress = (completedFields.length / totalFields) * 100;
  
  return (
    <div className="sticky top-0 z-50 bg-white shadow-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">
          Signing Progress: {completedFields.length} / {totalFields}
        </span>
        <span className="text-sm text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex gap-2 mt-2">
        {fields.map((field, index) => (
          <div 
            key={field.id}
            className={`text-xs px-2 py-1 rounded ${
              completedFields.includes(field.id)
                ? 'bg-green-100 text-green-800'
                : index === currentIndex
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {completedFields.includes(field.id) && '✓ '}
            {field.label || `Field ${index + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 4: Polish & Testing (30 mins)

#### 4.1 Animations
- Pulse animation cho field hiện tại
- Smooth scroll transitions
- Fade in/out effects

#### 4.2 Mobile Responsive
- Touch-friendly field sizes
- Mobile-optimized canvas
- Responsive progress header

#### 4.3 Error Handling
- Empty signature validation
- Network error handling
- Retry mechanism

## 📊 Acceptance Criteria

### Must Have ✅
- [ ] Click field → Ký trực tiếp trong field (không modal)
- [ ] Button "Start Signing" → Auto scroll đến field đầu
- [ ] Progress indicator hiển thị (X/Y fields)
- [ ] Auto scroll đến field tiếp theo sau khi ký xong
- [ ] Chỉ thấy fields của mình (filter theo signer)
- [ ] Button "Finish" sau field cuối
- [ ] Submit tất cả signatures

### Nice to Have 🎨
- [ ] Pulse animation cho field hiện tại
- [ ] Checkmarks cho fields đã ký
- [ ] Keyboard shortcuts (Enter = Done, Esc = Cancel)
- [ ] Undo last signature
- [ ] Preview all signatures before submit

## 🎨 UI/UX Reference

### SignNow Flow:
```
1. Landing page với PDF
2. Big button "Start" ở góc
3. Click Start → Zoom vào field đầu
4. Field expand → Canvas hiển thị
5. Ký → Click Done
6. Auto zoom đến field tiếp
7. Repeat
8. Field cuối → Button "Finish" xuất hiện
9. Click Finish → Success page
```

### DocuSign Flow:
```
1. PDF với tabs ở trên (Sign, Initial, Date)
2. Click tab → Scroll đến field type đó
3. Click field → Inline editor
4. Fill → Auto next
5. Progress bar ở top
6. "Finish" button khi done
```

## 🔧 Technical Notes

### Canvas Size Calculation
```tsx
// Field box size in pixels
const fieldWidth = (containerWidth * field.width) / 100;
const fieldHeight = (containerHeight * field.height) / 100;

// Canvas should fit inside field
<SignatureCanvas 
  width={fieldWidth - 16} // padding
  height={fieldHeight - 40} // buttons space
/>
```

### Scroll Behavior
```tsx
// Smooth scroll with offset for sticky header
element.scrollIntoView({
  behavior: 'smooth',
  block: 'center',
  inline: 'center',
});
```

### State Management
```tsx
// Track signing progress
interface SigningState {
  guidedMode: boolean;
  currentFieldIndex: number;
  completedFields: number[];
  signatures: Record<number, string>; // fieldId → signature data
}
```

## 📝 Testing Checklist

- [ ] Test với 1 field
- [ ] Test với nhiều fields (5+)
- [ ] Test với nhiều pages
- [ ] Test trên mobile
- [ ] Test với signature types khác (date, text, checkbox)
- [ ] Test cancel mid-flow
- [ ] Test refresh page (state persistence?)
- [ ] Test multiple signers (chỉ thấy của mình)

## 🚀 Quick Start Commands

```bash
# Backend đang chạy
# Frontend đang chạy

# Get OTP
node backend/scripts/get-otp.js

# Reset signer
node backend/scripts/reset-signer.js 44

# Add signature fields
node backend/scripts/add-signature-fields.js 40

# Test link
http://localhost:3000/sign/8eb20c827099ac688918a8913bda9ba3edc0e7c12b19b5e6fe8ae3da3a4c31a4
```

## 📊 Current Status

### ✅ Đã có:
- PDF viewer với iframe
- Signature fields overlay
- Fields filter theo signer
- Signature modal (3 methods)
- OTP verification
- Backend APIs complete

### 🔜 Cần làm:
- In-field signing (không modal)
- Guided flow với Start button
- Progress indicator
- Auto scroll
- Polish animations

## 💡 Tips

1. **Start small**: Implement in-field signing trước
2. **Test frequently**: Test sau mỗi feature
3. **Mobile first**: Design cho mobile trước
4. **Keep it simple**: Đừng over-engineer
5. **User feedback**: Toast notifications cho mọi action

## 🎯 Success Metrics

- ✅ User có thể ký tất cả fields trong < 2 phút
- ✅ Zero confusion (guided flow rõ ràng)
- ✅ Mobile friendly (touch-optimized)
- ✅ Professional look (như SignNow/DocuSign)

---

**Status**: 📋 Ready for Implementation  
**Next Session**: 2025-11-24  
**Estimated Time**: 2-3 hours  
**Difficulty**: Medium-High

Good luck! 🚀
