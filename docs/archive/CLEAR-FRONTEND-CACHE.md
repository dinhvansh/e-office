# 🔄 Clear Frontend Cache - Fix Workflow Preview

## Vấn đề
Workflow preview không hiển thị tên người ký và email, mặc dù backend API trả về đúng data.

## Nguyên nhân
- React Query đang cache data cũ (trước khi fix)
- Browser cache chưa được clear

## ✅ Giải pháp (Chọn 1 trong 3)

### Cách 1: Hard Refresh (Nhanh nhất) ⚡
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Cách 2: Clear Browser Cache 🧹
1. Mở DevTools: `F12`
2. Right-click vào nút Refresh
3. Chọn "Empty Cache and Hard Reload"

### Cách 3: Incognito Mode 🕵️
1. Mở Incognito/Private window
2. Login lại
3. Test workflow preview

## 🧪 Kiểm tra đã fix chưa

### Bước 1: Mở Console
1. Press `F12`
2. Go to Console tab
3. Clear console: `Ctrl + L`

### Bước 2: Upload Document
1. Chọn document type: "Hợp đồng" (HOPDONG)
2. Upload file
3. Scroll xuống "Quy trình phê duyệt"

### Bước 3: Check Console Logs
Tìm logs bắt đầu với `🔍 WorkflowPreview`:

```javascript
🔍 WorkflowPreview - workflowData: {...}
🔍 WorkflowPreview - steps: [...]
🔍 WorkflowPreview - first step: {...}
🔍 WorkflowPreview - has approver_name? true  ✅
🔍 WorkflowPreview - has approver_email? true ✅
```

### Bước 4: Verify UI
Nên thấy:
```
📋 Quy trình phê duyệt (Chế độ: Strict)

1. CẤP 1
   👤 Quản lý trực tiếp
   📧 (Tùy theo người tạo)
   
2. HR
   👤 Người phê duyệt
   📧 approver@acme.local
```

## ❌ Nếu vẫn không thấy

### Check 1: Verify API Response
```bash
# Run test script
cd backend
node scripts/test-workflow-frontend-debug.js

# Should show:
✅ ALL STEPS HAVE APPROVER INFO
```

### Check 2: Check Console Logs
Nếu console logs show:
```javascript
🔍 WorkflowPreview - has approver_name? false  ❌
🔍 WorkflowPreview - has approver_email? false ❌
```

→ React Query vẫn đang cache data cũ

### Check 3: Force Clear React Query Cache

**Option A: Via Code (Temporary)**
1. Open `frontend/components/workflow/WorkflowPreview.tsx`
2. Add to query:
```typescript
queryKey: ['workflow', workflowId, Date.now()], // Force new cache
```

**Option B: Via DevTools**
1. Install React Query DevTools (if not installed)
2. Open React DevTools
3. Find QueryClientProvider
4. Click "Invalidate All"

**Option C: Restart Frontend**
```bash
# Stop frontend (Ctrl+C)
# Start again
cd frontend
npm run dev
```

## 🎯 Expected Result

After clearing cache, you should see:

![Workflow Preview with Approver Info](expected-result.png)

- ✅ Step 1: "Quản lý trực tiếp" + "(Tùy theo người tạo)"
- ✅ Step 2: "Người phê duyệt" + "approver@acme.local"

## 📝 Notes

- Backend API is 100% correct ✅
- Issue is purely frontend cache
- This is a one-time fix
- After clearing cache once, it should work permanently

## 🆘 Still Not Working?

Send me:
1. Screenshot of Console logs (F12 → Console)
2. Screenshot of Network tab (F12 → Network → /workflows/8)
3. Screenshot of current UI

I'll help debug further!
