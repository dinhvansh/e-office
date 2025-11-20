# Fix: Dialog Responsive on Small Screens

**Date**: 2025-11-20  
**Issue**: Dialog modals bị cắt trên màn hình nhỏ, không scroll được
**Status**: ✅ Fixed

## 🐛 Problem

Trên màn hình nhỏ (mobile, tablet), các dialog form dài bị cắt và không thể scroll để xem hết nội dung.

**Ảnh hưởng**:
- Users page - Create/Edit user form
- Roles page - Create/Edit role form  
- Departments page - Create/Edit department form
- External Orgs page - Create/Edit org form

## ✅ Solution

Thêm `max-h-[90vh]` và `overflow-y-auto` cho tất cả DialogContent.

### Before
```tsx
<DialogContent className="sm:max-w-[500px]">
```

### After
```tsx
<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
```

## 📝 Files Fixed

1. ✅ `frontend/app/(dashboard)/users/page.tsx`
2. ✅ `frontend/app/(dashboard)/roles/page.tsx`
3. ✅ `frontend/app/(dashboard)/departments/page.tsx`
4. ✅ `frontend/app/(dashboard)/external-orgs/page.tsx`
5. ✅ `frontend/app/(dashboard)/document-types/page.tsx` (already had it)

## 🎨 Responsive Classes Applied

- `max-h-[90vh]` - Maximum height 90% viewport height
- `overflow-y-auto` - Enable vertical scrolling
- `sm:max-w-[XXXpx]` - Responsive max width (mobile-first)

## 🧪 Testing

Test on different screen sizes:
- ✅ Mobile (375px) - Dialog scrollable
- ✅ Tablet (768px) - Dialog scrollable
- ✅ Desktop (1024px+) - Dialog fits without scroll

## 📱 Mobile-First Approach

Following UI Refactor spec requirement:
> Áp dụng nguyên tắc **Mobile-First** (sử dụng class Tailwind: `sm:`, `md:`, `lg:`, …)

All dialogs now work perfectly on small screens!
