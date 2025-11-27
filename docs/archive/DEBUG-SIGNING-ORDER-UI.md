# Debug: Không sửa được thứ tự ký

## 🐛 Vấn đề
User không thể thay đổi số trong field "Thứ tự ký"

## 🔍 Các khả năng

### 1. Browser Cache (90% khả năng)
**Triệu chứng**: Code đã update nhưng UI không thay đổi

**Giải pháp**:
```bash
# Bước 1: Hard refresh
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)

# Bước 2: Clear cache
F12 → Application → Clear storage → Clear site data

# Bước 3: Restart frontend
Ctrl+C trong terminal frontend
npm run dev
```

### 2. Input bị disabled
**Kiểm tra**: Click vào input, nếu không focus được = disabled

**Giải pháp**: Đã thêm `disabled={false}` trong code

### 3. State không update
**Kiểm tra**: Mở Console (F12), thay đổi số, xem có log không

**Expected logs**:
```
📝 Order changed: 1234567890 from 1 to 2
🔄 Updating signer: 1234567890 order 2 Result: [...]
```

**Nếu không có log** = onChange không fire = Browser cache issue

### 4. CSS readonly
**Kiểm tra**: Inspect element (F12), xem có `readonly` attribute không

**Giải pháp**: Đã thêm `bg-white` để override

## ✅ Cách test đúng

### Bước 1: Restart Everything
```powershell
# Stop frontend
Ctrl+C trong terminal frontend

# Clear node_modules/.cache (nếu có)
Remove-Item frontend/.next -Recurse -Force

# Start lại
cd frontend
npm run dev
```

### Bước 2: Hard Refresh Browser
```
Ctrl + Shift + R
```

### Bước 3: Open Console
```
F12 → Console tab
```

### Bước 4: Test Input
1. Go to: http://localhost:3000/documents
2. Upload file
3. Select: "Hợp đồng"
4. Scroll down → "Người ký bên ngoài"
5. Click "Thêm người ký"
6. **Click vào field "Thứ tự ký"**
7. **Check console**: Phải thấy log "🎯 Order input focused: ..."
8. **Type số mới** (ví dụ: 2)
9. **Check console**: Phải thấy log "📝 Order changed: ... from 1 to 2"

### Bước 5: Verify State
1. Thêm người ký thứ 2
2. Đổi order người 1 → 2
3. Đổi order người 2 → 1
4. Check: Số có thay đổi trong UI không?

## 🎯 Expected Behavior

**Khi click vào input**:
- Input được focus (border tím)
- Console log: "🎯 Order input focused: ..."

**Khi type số mới**:
- Số hiển thị trong input
- Console log: "📝 Order changed: ... from X to Y"
- Console log: "🔄 Updating signer: ..."

**Khi blur (click ra ngoài)**:
- Số mới được lưu trong state
- UI update với số mới

## 🔧 Nếu vẫn không work

### Option 1: Check React DevTools
```bash
# Install React DevTools extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/...

# Open DevTools → Components tab
# Find SignersSection component
# Check props: signers array
# Check state: Có update khi type không?
```

### Option 2: Simplify Test
Tạo file test đơn giản:
```tsx
// Test component
const [order, setOrder] = useState(1);

<input 
  type="number" 
  value={order}
  onChange={(e) => {
    console.log("Changed to:", e.target.value);
    setOrder(parseInt(e.target.value));
  }}
/>
```

Nếu test component work = Vấn đề ở parent component (documents/page.tsx)

### Option 3: Check Parent State
File: `frontend/app/(dashboard)/documents/page.tsx`

Tìm:
```tsx
const [signers, setSigners] = useState<Signer[]>([]);
```

Check: `setSigners` có được gọi không?

## 📸 Screenshot để debug

Chụp màn hình:
1. Console logs khi click input
2. Console logs khi type số
3. React DevTools → Components → SignersSection props
4. Network tab → Có request nào fire không?

## 🚨 Common Issues

### Issue 1: Input không focus được
**Nguyên nhân**: CSS `pointer-events: none` hoặc `disabled`
**Fix**: Thêm `disabled={false}` và `bg-white`

### Issue 2: onChange không fire
**Nguyên nhân**: Browser cache hoặc event listener bị override
**Fix**: Hard refresh + Clear cache

### Issue 3: State update nhưng UI không re-render
**Nguyên nhân**: React không detect state change (reference equality)
**Fix**: Đã dùng `.map()` để tạo new array

### Issue 4: Value bị reset về 1
**Nguyên nhân**: Parent component re-render và reset state
**Fix**: Check parent component có `useEffect` nào reset state không

## ✅ Verification Checklist

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear browser cache
- [ ] Restart frontend server
- [ ] Console shows focus log
- [ ] Console shows change log
- [ ] Number changes in UI
- [ ] State persists after blur
- [ ] Can add multiple signers
- [ ] Can change order of each signer
- [ ] Order saves when upload

## 📞 Next Steps

Nếu sau khi làm tất cả các bước trên vẫn không work:
1. Chụp screenshot console logs
2. Chụp screenshot React DevTools
3. Share để debug tiếp
