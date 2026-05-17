# TASK: Cây sơ đồ tổ chức (Org Chart) cho Phòng ban

**Owner dev chính**: Kiro (DEV1)  
**Người thiết kế**: Senior Software Architect (GPT)  
**Trạng thái**: ✅ COMPLETE (2025-11-21)  
**Phase**: 1.5 – UX + chuẩn bị cho RBAC/Workflow theo tổ chức  
**Duration**: ~30 minutes  
**Report**: See `FEATURE-ORG-CHART-COMPLETE.md`

---

## 1. Mục tiêu

Nâng cấp trang **Quản lý Phòng ban** thành **sơ đồ tổ chức** giống mock:

- Bên trái: Cây tổ chức (Org Tree) gồm Công ty mẹ / Công ty con / Phòng ban (nhiều cấp).  
- Bên phải: Bảng chi tiết phòng ban theo node đang chọn (Tên, Mã, Trưởng phòng, Phòng cha, Ngày tạo, Hành động...).  
- Bảo toàn:
  - Multi‑tenant (mỗi tenant có tree riêng).  
  - RBAC hiện có (`departments` module vẫn sau `authGuard`, có thể thêm `requirePermission` sau này).  

Task này **KHÔNG** thay đổi logic phân quyền hay document visibility – chỉ tập trung vào mô hình cây + UI. (RBAC & document rules sẽ dùng tree này ở Phase 2.)  

---

## 2. Hiện trạng

### 2.1 Backend

- Prisma `departments` đã có:
  - `tenant_id`, `code`, `name`, `parent_id`, `manager_id`, `description`, v.v.  
  - Quan hệ self‑reference `parent` / `children`.  
- Module `departments` có sẵn:
  - API `GET /departments` (flat list).  
  - API `GET /departments/tree` (trả về cây, đang được dùng bởi frontend).  

### 2.2 Frontend

- Trang `/departments` hiện tại (`frontend/app/(dashboard)/departments/page.tsx`):
  - Đã **render tree** bằng cách indent theo `level` (paddings + icon), **không có panel trái riêng**.  
  - Tạo/sửa/xoá phòng ban bằng modal; list trong 1 card duy nhất.

=> Về dữ liệu, đã hỗ trợ cây; việc còn lại chủ yếu là **tổ chức lại layout UI** + một chút API cho stats nếu cần.

---

## 3. Thiết kế dữ liệu (Backend – Optional, nếu muốn phân loại node)

Để map đúng với mock (có node “Công ty con A/B” khác với “Phòng”), có thể (tùy chọn) thêm 1 field loại node:

```prisma
model departments {
  id          Int       @id @default(autoincrement())
  tenant_id   Int
  code        String?   @db.VarChar(50)
  name        String
  parent_id   Int?
  manager_id  Int?
  description String?

  kind        String?   @default("department") // 'company' | 'division' | 'department' | ...

  created_at  DateTime  @default(now())
  // ... relations giữ nguyên
}
```

Trong scope task này, **không bắt buộc** phải thêm `kind`; có thể suy luận “Công ty con” đơn giản là node ở level 1/2. Nếu thêm, nhớ db push + update repository/types tương ứng.

---

## 4. Backend – API (đủ dùng cho Org Chart)

Không cần tạo API mới, chỉ cần đảm bảo:

- `GET /departments/tree`:
  - Trả về mảng root departments, mỗi department có `children`, `manager`, `_count`, v.v. (như hiện tại).  
  - Đã sử dụng trong frontend qua `fetchJson('/departments/tree')`.

Option (không bắt buộc trong task này nhưng nên cân nhắc nếu thiếu):

- Hỗ trợ query `GET /departments` với params:
  - `?parent_id=...` để lấy danh sách con trực tiếp của 1 node (phục vụ bảng chi tiết).  
  - `?search=...` để filter theo tên/mã (nếu muốn backend support search).

---

## 5. Frontend – Layout Org Chart

**File**: `frontend/app/(dashboard)/departments/page.tsx`

### 5.1 Mục tiêu UI

Giống mock (sơ đồ quản lý phòng ban):

- Cột trái: Tree “Cấu trúc Tổ chức” (click chọn node).  
- Cột phải: Bảng chi tiết các phòng ban nằm dưới node chọn (thường là “các phòng trực thuộc”).
- Thanh search phía trên bảng (lọc theo tên/mã).  
- Actions: tạo mới, edit, delete phòng ban như hiện tại.

### 5.2 Data & state

- Dùng `useQuery(['departments-tree'])` như hiện tại để load full tree 1 lần.  
- Thêm state:
  - `selectedDepartmentId: number | null` – node đang chọn trên tree (null = toàn tổ chức).  
  - `search: string` – chuỗi tìm kiếm.  

Logic:

- Khi chọn 1 node trong tree:
  - Cập nhật `selectedDepartmentId`.  
  - Bảng bên phải hiển thị:
    - Các phòng ban con trực tiếp của node đó (hoặc toàn bộ subtree, tùy bạn chọn, nhưng nên là con trực tiếp để bảng không quá dài).  

- Khi `search` không rỗng:
  - Bảng lọc theo tên/mã phẳng (bỏ `selectedDepartmentId` hoặc kết hợp cả hai, tuỳ UX):
    - Ví dụ: search áp dụng trong node hiện tại (optional).

### 5.3 Component tree (cột trái)

- Trích logic `renderDepartment` hiện tại thành một component riêng dùng cho cột trái:
  - Chỉ hiển thị `name`, icon folder, số con, indent theo level.  
  - Khi click vào node, set `selectedDepartmentId = dept.id`.  
  - Node đang chọn: highlight khác (background, border, text color).

Gợi ý cấu trúc:

```tsx
<div className="grid gap-6 md:grid-cols-[280px_1fr]">
  <aside className="bg-card rounded-xl border shadow-sm p-2">
    {/* Tree view */}
  </aside>
  <main className="space-y-4">
    {/* Search + table */}
  </main>
</div>
```

### 5.4 Bảng chi tiết (cột phải)

- Bảng bao gồm các cột:
  - Tên phòng ban.  
  - Mã phòng ban.  
  - Trưởng phòng.  
  - Phòng ban cha.  
  - Ngày tạo.  
  - Hành động (edit/delete).  

- Nguồn dữ liệu:
  - Nếu `selectedDepartmentId` = null:
    - Hiển thị toàn bộ departments (hoặc chỉ root, tuỳ chọn).  
  - Nếu `selectedDepartmentId` ≠ null:
    - Lọc từ tree hoặc gọi API bổ sung `GET /departments?parent_id=...`.  

- Lọc search:
  - Lọc theo `name` hoặc `code` trong tập dữ liệu đã chọn.  

Sử dụng các component UI đã có: `PageHeader`, `Card`, `Input`, `Table`, `Button`, `Badge`, `EmptyState`.

### 5.5 Modal tạo/sửa phòng ban

- Xử lý gần giống code hiện tại (đã có), nhưng cần cho phép chọn **Phòng ban cha** khi tạo/sửa:
  - Thêm dropdown/combobox để chọn parent (có thể dựng từ tree hoặc list).  
  - Khi tạo từ node đang chọn:
    - Pre‑fill `parent_id = selectedDepartmentId`.

---

## 6. Ảnh hưởng tới RBAC & hệ thống

Trong task này:

- **Không thay đổi** cách check quyền: vẫn `authGuard` + (optional) `requirePermission('departments','read/update/delete')` nếu đã config.  
- Không thay đổi logic multi‑tenant: mọi gọi API vẫn filter theo `tenant_id`.  
- Org chart chỉ là **cách hiển thị & quản lý cây department**, sẽ được các task Phase 2 (RBAC/document visibility/workflow) dùng để:
  - Áp rule theo phòng ban + tree.  
  - Chọn approver theo department/manager.

---

## 7. Acceptance Criteria

### 7.1 Backend

- [ ] `GET /departments/tree` vẫn trả về dữ liệu đúng (không thay đổi signature).  
- [ ] Nếu có thêm `kind` (optional), đảm bảo nó không phá các module khác (users, workflows).

### 7.2 Frontend

- [ ] Trang `/departments` hiển thị layout 2 cột:
  - Tree “Cấu trúc tổ chức” bên trái.  
  - Bảng chi tiết bên phải.  
- [ ] Click vào node trong tree:
  - Bảng bên phải chỉ hiển thị phòng ban tương ứng (con trực tiếp hoặc logic đã chọn).  
  - Node đang chọn được highlight rõ.  
- [ ] Search theo tên/mã hoạt động đúng, không phá selection.  
- [ ] Tạo phòng ban mới từ trạng thái “đang chọn node X” → parent của phòng mới là X (nếu UX yêu cầu vậy).  
- [ ] Edit/delete phòng ban vẫn hoạt động như cũ (kể cả khi UI đổi layout).

---

## 8. Ghi chú cho reviewer (GPT)

- Kiểm tra `frontend/app/(dashboard)/departments/page.tsx`:
  - Tree tách ra cột trái, không còn đổ lẫn trong bảng/list.  
  - Modal tạo/sửa có trường chọn parent (nếu được yêu cầu).  
- Đảm bảo không phá các hành vi đã có: tạo/sửa/xoá, hiển thị số users, manager, counts.  
- Kiểm tra performance cơ bản khi tree nhiều node (render không lag).  

