# 🚨 TODO URGENT - For Next Session

## ✅ COMPLETED (2025-11-20)

### ✅ 1. Roles - Edit Function
**Status**: ✅ DONE - Edit functionality implemented

**What was done**:
- Added `editingRole` state
- Updated mutation to handle both create & edit (PUT vs POST)
- Edit button now opens modal with pre-filled data
- Dynamic dialog title and button text
- Toast notifications for success/error

### ✅ 2. Users - Create Function
**Status**: ✅ DONE - Create modal with full form

**What was done**:
- Added create modal with all fields
- Fields: email, password, full_name, phone, department_id, role_ids[]
- Department dropdown (fetched from API)
- Role checkboxes (multi-select)
- POST to `/users` endpoint
- Toast notifications

### ✅ 3. Users - Edit Function  
**Status**: ✅ DONE - Edit functionality implemented

**What was done**:
- Edit button opens modal with pre-filled data
- PUT to `/users/:id`
- Password field optional on edit (leave blank to keep current)
- Email field disabled on edit (cannot change)
- Pre-selects department and roles
- Toast notifications

---

## 📋 Implementation Pattern (Copy from Departments)

```typescript
// 1. Add editing state
const [editingItem, setEditingItem] = useState<Item | null>(null);

// 2. Update mutation
mutationFn: (data) => {
  if (editingItem) {
    return fetchJson(`/endpoint/${editingItem.id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }
  return fetchJson('/endpoint', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  });
}

// 3. Update onSuccess
onSuccess: () => {
  setShowModal(false);
  setEditingItem(null);
  setFormData(initialState);
  toast.success(editingItem ? 'Cập nhật thành công!' : 'Tạo thành công!');
  setTimeout(() => queryClient.refetchQueries({ queryKey: ['items'] }), 300);
}

// 4. Edit button
<Button onClick={() => {
  setEditingItem(item);
  setFormData({ ...item });
  setShowModal(true);
}}>
  <Edit />
</Button>

// 5. Dialog title
<DialogTitle>{editingItem ? 'Chỉnh sửa' : 'Thêm mới'}</DialogTitle>
```

---

## ⏱️ Actual Time Spent
- Roles Edit: ~5 minutes ✅
- Users Create: ~15 minutes ✅
- Users Edit: ~5 minutes ✅
**Total**: ~25 minutes (faster than estimated!)

---

## ✅ All CRUD Operations Complete
- ✅ Departments Create
- ✅ Departments Edit
- ✅ Departments Delete
- ✅ Roles Create
- ✅ Roles Edit ← NEW!
- ✅ Roles Delete
- ✅ Users Create ← NEW!
- ✅ Users Edit ← NEW!
- ✅ Users Delete
- ✅ External Orgs (full CRUD)
- ✅ Document Types (full CRUD)

---

## 🎉 Phase 1 CRUD: 100% Complete!

All basic CRUD operations for Phase 1 are now implemented with:
- shadcn/ui components
- Toast notifications
- Proper error handling
- Data refetching strategies
- Edit/Create modal reuse pattern
