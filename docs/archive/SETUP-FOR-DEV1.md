# Setup Guide for Dev1 - After Pull

**Date**: 2025-11-21  
**Last Update**: Session UI Improvements

---

## 🚀 Quick Start

```bash
# 1. Pull latest code
git pull origin main

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Install backend dependencies (if needed)
cd ../backend
npm install

# 4. Start servers
cd ..
./start-all.ps1
```

---

## 📦 New Dependencies Installed

### Frontend Packages

```bash
cd frontend
npm install @radix-ui/react-tabs
```

**Package Details**:
- `@radix-ui/react-tabs@^1.0.4` - Tab navigation component
- Used in: Approvals page, future tab-based UIs

### All Frontend Dependencies (for reference)
```json
{
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-switch": "^1.0.3",
  "@radix-ui/react-tabs": "^1.0.4",
  "@tanstack/react-query": "^5.x",
  "sonner": "^1.x",
  "dayjs": "^1.x",
  "lucide-react": "^0.x",
  "next": "14.x",
  "react": "^18.x",
  "tailwindcss": "^3.x"
}
```

---

## 🆕 New Components Created

### 1. ConfirmDialog
**File**: `frontend/components/ui/confirm-dialog.tsx`

**Usage**:
```tsx
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

<ConfirmDialog
  open={deleteConfirm.open}
  onOpenChange={(open) => setDeleteConfirm({ open, id: null })}
  onConfirm={confirmDelete}
  title="Xác nhận xóa"
  description="Bạn có chắc chắn muốn xóa?"
  confirmText="Xóa"
  cancelText="Hủy bỏ"
  variant="danger"
  icon="trash"
/>
```

### 2. SelectWithIcon
**File**: `frontend/components/ui/select-with-icon.tsx`

**Usage**:
```tsx
import { SelectWithIcon } from '@/components/ui/select-with-icon';

const options = [
  { value: 'incoming', label: 'Văn bản đến', icon: '📥' },
  { value: 'outgoing', label: 'Văn bản đi', icon: '📤' },
];

<SelectWithIcon
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="Chọn..."
/>
```

### 3. Tabs
**File**: `frontend/components/ui/tabs.tsx`

**Usage**:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## 🔧 Modified Pages

### 1. Workflows Page
**File**: `frontend/app/(dashboard)/workflows/page.tsx`

**Changes**:
- Card grid layout (was list view)
- Search bar + filter tabs
- Toggle switch for active/inactive
- Left border color indicator
- ConfirmDialog for delete actions

### 2. Documents Page
**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Changes**:
- Added "Quy trình phê duyệt" dropdown
- SelectWithIcon for "Loại văn bản"
- ConfirmDialog for delete

### 3. Document Types Page
**File**: `frontend/app/(dashboard)/document-types/page.tsx`

**Changes**:
- SelectWithIcon for "Danh mục" dropdown
- Better icon display (📥📤🏢📋)

### 4. Approvals Page
**File**: `frontend/app/(dashboard)/approvals/page.tsx`

**Changes**:
- Fixed missing Tabs component
- Now builds without errors

---

## 🐛 Troubleshooting

### Issue 1: Module not found '@radix-ui/react-tabs'
**Solution**:
```bash
cd frontend
npm install @radix-ui/react-tabs
```

### Issue 2: Build errors after pull
**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: TypeScript errors in new components
**Solution**:
```bash
# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue 4: Styles not applying
**Solution**:
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

---

## 🧪 Testing Checklist

After setup, test these features:

### Workflows Page
- [ ] View workflows in card grid
- [ ] Search workflows by name
- [ ] Filter by status (Tất cả/Đang hoạt động/Tạm dừng)
- [ ] Toggle workflow active/inactive
- [ ] Delete workflow (confirm dialog appears)
- [ ] Edit workflow
- [ ] Manage workflow steps

### Documents Page
- [ ] Upload document
- [ ] Select document type (with icons)
- [ ] Select workflow (optional)
- [ ] Delete document (confirm dialog appears)

### Document Types Page
- [ ] Create document type
- [ ] Select category (with icons: 📥📤🏢📋)
- [ ] Edit document type
- [ ] Delete document type

### Approvals Page
- [ ] Page loads without errors
- [ ] Tabs work correctly

---

## 📁 File Structure

```
frontend/
├── components/ui/
│   ├── confirm-dialog.tsx      ← NEW
│   ├── select-with-icon.tsx    ← NEW
│   ├── tabs.tsx                ← NEW
│   └── switch.tsx              ← EXISTING
├── app/(dashboard)/
│   ├── workflows/page.tsx      ← MODIFIED
│   ├── documents/page.tsx      ← MODIFIED
│   ├── document-types/page.tsx ← MODIFIED
│   └── approvals/page.tsx      ← MODIFIED
└── package.json                ← UPDATED

docs/dev/
└── SESSION-2025-11-21-UI-IMPROVEMENTS.md ← NEW
```

---

## 🎨 UI Changes Summary

### Color Scheme
- **Active**: Green border-left + white background
- **Paused**: Gray border-left + gray-50 background
- **Primary**: Blue buttons
- **Danger**: Red delete buttons

### Layout
- Card grid: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
- Search: Left side, 320px width
- Filters: Right side, with badge counts

---

## 🔐 Environment Variables

No new environment variables needed for this update.

---

## 📝 Notes

1. **package-lock.json**: Committed to repo, so `npm install` should be fast
2. **No database changes**: No migrations needed
3. **No backend changes**: Only frontend UI improvements
4. **Backward compatible**: Old code still works

---

## 🆘 Need Help?

If you encounter issues:

1. Check `docs/dev/SESSION-2025-11-21-UI-IMPROVEMENTS.md` for details
2. Check `LESSONS-LEARNED.md` for common pitfalls
3. Run `npm install` in frontend folder
4. Clear cache: `rm -rf .next node_modules && npm install`
5. Restart dev server

---

## ✅ Verification

After setup, verify everything works:

```bash
# Frontend should start without errors
cd frontend
npm run dev

# Should see:
# ✓ Ready in Xms
# ○ Compiling / ...
# ✓ Compiled / in Xms
```

Visit: http://localhost:3000
- Login should work
- All pages should load
- No console errors

---

**Setup Complete!** 🎉

If all tests pass, you're ready to continue development.
