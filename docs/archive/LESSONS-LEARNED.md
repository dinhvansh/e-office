# Lessons Learned - WP Sign E-Office Development

## 📝 Kinh nghiệm quan trọng cho AI tiếp theo

### 1. 🗄️ Database & Multi-Tenant
**QUAN TRỌNG NHẤT**: Đây là hệ thống **SaaS Multi-Tenant**!

- ✅ **LUÔN** có `tenant_id` trong mọi unique constraint
- ✅ **LUÔN** check ERD.md trước khi thêm/sửa field
- ✅ Migration phải **backward compatible** (không break existing data)
- ✅ Unique constraint: `(tenant_id, field)` - KHÔNG phải unique global
- ❌ **KHÔNG BAO GIỜ** xóa data hoặc DROP column
- ❌ **KHÔNG BAO GIỜ** tạo unique constraint global (sẽ conflict giữa tenants)

**Ví dụ đúng**:
```sql
-- ✅ ĐÚNG: Unique per tenant
CREATE UNIQUE INDEX "departments_tenant_id_code_key" 
ON "departments"("tenant_id", "code") WHERE "code" IS NOT NULL;

-- ❌ SAI: Unique global (conflict giữa tenants)
ALTER TABLE "departments" ADD CONSTRAINT "departments_code_key" UNIQUE ("code");
```

### 2. 🔐 Authentication & Permissions
**Vấn đề gặp phải**: 401/403 errors do token/permissions

**Giải pháp**:
- Token được lưu trong `localStorage` với key `esign.auth`
- Structure: `{ tokens: { accessToken, refreshToken }, user, tenant }`
- **LUÔN dùng** `useAuth()` hook với `fetchJson()` helper
- `fetchJson()` tự động unwrap `response.data` → return trực tiếp data array/object
- Sau khi seed RBAC, phải **assign role Admin** cho user
- Sau khi assign role, phải **logout & login lại** để có token mới

**Code pattern đúng**:
```typescript
// ✅ ĐÚNG
const { fetchJson } = useAuth();
const { data } = useQuery({
  queryKey: ['roles'],
  queryFn: () => fetchJson('/roles'), // fetchJson đã unwrap .data
});
const roles = data || []; // data ĐÃ là array

// ❌ SAI
const roles = data?.data || []; // Sai! fetchJson đã unwrap rồi
```

### 3. 🎨 UI & Styling
**Vấn đề**: CSS cũ bị mất khi migrate sang shadcn/ui

**Giải pháp**:
- Giữ lại custom classes trong `@layer components` (button-primary, input, chip)
- Background gradient: `linear-gradient(135deg, #eef2ff, #f5f7fb 40%, #f8fbff 100%)`
- Cards cần: `bg-white/95` + `backdrop-blur` + shadow để nổi trên gradient
- Toast notifications: Dùng `sonner` thay vì `alert()`

### 4. 🔄 Data Fetching & Caching
**Vấn đề**: Data mới tạo không hiện lên

**Nguyên nhân**:
1. Browser cache (304 Not Modified)
2. React Query cache
3. Response structure không đúng
4. Sorting không đúng

**Giải pháp**:
```typescript
// ✅ Refetch sau khi create
onSuccess: async () => {
  setShowModal(false);
  toast.success('Tạo thành công!');
  setTimeout(async () => {
    await queryClient.refetchQueries({ queryKey: ['items'] });
  }, 300); // Delay 300ms để backend lưu xong
}

// ✅ Sort mới nhất lên trên (frontend)
const items = (data || []).sort((a, b) => b.id - a.id);

// ✅ Query options
{
  staleTime: 0,
  refetchOnMount: 'always',
}
```

### 5. 🐛 Debugging Process
**Quy trình debug hiệu quả**:

1. **Check backend logs** trước:
   - 401 → Token issue
   - 403 → Permission issue
   - 304 → Cache issue
   - 500 → Backend error

2. **Check database** thực tế:
   ```javascript
   // Tạo script check-db-data.js
   const { Client } = require('pg');
   // Query trực tiếp DB để verify data
   ```

3. **Check response structure**:
   - Backend return: `{ success: true, data: [...] }`
   - `fetchJson()` unwrap: return `data` directly
   - Frontend nhận: array/object trực tiếp

4. **Hard refresh** nếu cần:
   - Ctrl + Shift + R
   - F12 → Network → Disable cache

### 6. 📦 Component Patterns
**shadcn/ui integration**:

```typescript
// ✅ Import pattern
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ✅ Dialog pattern
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tạo mới</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  </DialogContent>
</Dialog>

// ✅ Toast pattern
toast.success('Thành công!');
toast.error(`Lỗi: ${error.message}`);
```

### 7. 🔧 Common Pitfalls
**Những lỗi thường gặp**:

1. **Gõ nhầm package name**: `@tantml:react-query` → `@tanstack/react-query`
2. **React Query v5**: Dùng `refetchOnMount` thay vì `cacheTime`
3. **PowerShell syntax**: Không dùng `cd`, dùng `path` parameter
4. **Prisma generate**: File đang được dùng → Restart backend
5. **Browser cache**: 304 → Hard refresh hoặc disable cache

### 8. 📋 File Structure
**Quan trọng**:
- `ERD.md` - Source of truth cho database schema
- `AGENTS.md` - Progress log, luôn update
- `backend/.env` - Database connection: `esign:esignpass@localhost:5432/esign`
- `frontend/.env.local` - API URL: `http://localhost:4000/api/v1`

### 9. 🚀 Development Workflow
**Quy trình chuẩn**:

1. Check ERD.md cho schema
2. Tạo migration SQL
3. Update Prisma schema
4. Run `npx prisma db push`
5. Update repository (add methods)
6. Update service (add validation)
7. Update controller (if needed)
8. Update frontend (form + display)
9. Test thoroughly
10. Update AGENTS.md

### 10. ⚠️ Critical Rules
**KHÔNG BAO GIỜ**:
- ❌ Xóa data trong production
- ❌ Unique constraint global trong multi-tenant
- ❌ Thay đổi schema không có migration
- ❌ Commit code có lỗi TypeScript
- ❌ Dùng `alert()` thay vì toast
- ❌ Parse `data?.data` khi dùng `fetchJson()`

**LUÔN LUÔN**:
- ✅ Check ERD.md trước khi thay đổi DB
- ✅ Test với nhiều tenants
- ✅ Validate unique constraints per tenant
- ✅ Hard refresh sau khi thay đổi lớn
- ✅ Update AGENTS.md sau mỗi session
- ✅ Dùng `fetchJson()` từ `useAuth()` hook

---

## 🎯 Quick Reference

### Backend Stack
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Multi-tenant architecture
- JWT authentication
- Permission-based access control

### Frontend Stack
- Next.js 14 (App Router)
- React Query (TanStack Query)
- shadcn/ui + Tailwind CSS
- Sonner (toast notifications)
- Custom auth provider

### Database
- PostgreSQL (Docker)
- Connection: `esign:esignpass@localhost:5432/esign`
- Multi-tenant with `tenant_id` in every table
- Unique constraints: Always `(tenant_id, field)`

### Ports
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

**Lưu ý cuối**: Đọc kỹ AGENTS.md để biết progress hiện tại và những gì đã làm!
