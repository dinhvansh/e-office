# 🚀 Handoff Document for Dev2

**Date**: 2025-11-20  
**From**: Dev1 + AI Assistant  
**To**: Dev2 (Next Developer)  
**Project**: E-Office System (Document Management + Approval Workflow)

---

## 📋 Current Status

### ✅ Phase 1: COMPLETE (100%)
**Duration**: ~10 hours  
**Features**:
- Multi-tenant architecture
- RBAC (Roles, Permissions, Departments, Users)
- Document types with auto-numbering
- External organizations
- Document tags & permissions
- Document versions
- Document visibility & access control
- Full CRUD for all entities

### ✅ Phase 2 Week 1: COMPLETE (100%)
**Duration**: ~6 hours  
**Backend Features**:
- Workflows module (templates)
- Workflow steps (multi-step approval)
- Approvals module (approve/reject/request-info)
- Workflow instances tracking
- Document approvals history
- 18 API endpoints
- 4 new database tables

### 🔄 Phase 2 Week 2: IN PROGRESS (20%)
**Duration**: ~1 hour so far  
**Frontend Features**:
- ✅ Workflows list page with CRUD
- ✅ Display workflow steps
- 🔜 Workflow Builder (add/edit/delete steps)
- 🔜 Approvals UI
- 🔜 Integration & testing

---

## 🎯 Your Mission: Complete Phase 2 Week 2

**Estimated Time**: 6-8 hours  
**Goal**: Finish Workflow Engine UI

### Task 1: Workflow Builder (3-4 hours)
**File**: `frontend/app/(dashboard)/workflows/page.tsx`

**Requirements**:
1. **Add Steps to Workflow**
   - Button "Thêm bước" in workflow detail
   - Modal with form:
     - Step name (input)
     - Step order (auto-increment)
     - Approver type (dropdown: user/role/department/manager)
     - Approver selector (conditional based on type):
       - User: Dropdown from `/users`
       - Role: Dropdown from `/roles`
       - Department: Dropdown from `/departments`
       - Manager: No selector (auto-detect)
   - POST `/workflows/:id/steps`

2. **Edit Steps**
   - Edit button on each step
   - Pre-fill form with existing data
   - PUT `/workflows/:id/steps/:stepId`

3. **Delete Steps**
   - Delete button with confirmation
   - DELETE `/workflows/:id/steps/:stepId`

4. **Reorder Steps**
   - Up/Down arrows
   - POST `/workflows/:id/steps/:stepId/reorder`
   - Body: `{ new_order: number }`

**API Endpoints** (already exist):
```
POST   /workflows/:id/steps
PUT    /workflows/:id/steps/:stepId
DELETE /workflows/:id/steps/:stepId
POST   /workflows/:id/steps/:stepId/reorder
GET    /workflows/:id/available-approvers
```

**Reference**: Check `backend/src/modules/workflows/workflows.controller.ts`

---

### Task 2: Assign Workflow to Document Type (1 hour)
**File**: `frontend/app/(dashboard)/document-types/page.tsx`

**Requirements**:
1. Add "Quy trình phê duyệt" dropdown in document type form
2. Fetch workflows from `/workflows`
3. Save `workflow_id` when creating/editing document type
4. Display assigned workflow in document type card

**Database**: Field `workflow_id` already exists in `document_types` table

---

### Task 3: Approvals UI (3-4 hours)
**File**: `frontend/app/(dashboard)/approvals/page.tsx`

**Requirements**:
1. **My Pending Approvals List**
   - Fetch from `/approvals/my-pending`
   - Display cards with:
     - Document name & number
     - Document type
     - Current step name
     - Owner info
     - Action buttons (Approve/Reject/Request Info)

2. **Approval Actions Modal**
   - Click action button → Open modal
   - Form:
     - Comment textarea (required for reject/request-info)
     - Confirm/Cancel buttons
   - API calls:
     - POST `/approvals/:id/approve` (body: `{ comment }`)
     - POST `/approvals/:id/reject` (body: `{ comment }`)
     - POST `/approvals/:id/request-info` (body: `{ comment }`)

3. **Approval History**
   - Fetch from `/approvals/history/:documentId`
   - Display timeline:
     - Step name
     - Approver name
     - Action (approved/rejected/requested-info)
     - Comment
     - Timestamp

**API Endpoints** (already exist):
```
GET  /approvals/my-pending
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /approvals/:id/request-info
GET  /approvals/history/:documentId
```

---

### Task 4: Submit Document to Workflow (1 hour)
**File**: `frontend/app/(dashboard)/documents/page.tsx`

**Requirements**:
1. Add "Gửi phê duyệt" button in document detail
2. Check if document type has workflow assigned
3. If yes, show confirmation modal:
   - Workflow name
   - Steps preview
   - Confirm button
4. POST `/approvals/submit` (body: `{ document_id }`)
5. Update document status to "pending_approval"

**API Endpoint** (already exists):
```
POST /approvals/submit
Body: { document_id: number }
```

---

### Task 5: Testing & Bug Fixes (1-2 hours)

**Test Scenarios**:
1. Create workflow with 2-3 steps
2. Assign workflow to document type
3. Upload document with that type
4. Submit document for approval
5. Login as approver → Approve
6. Check if moves to next step
7. Final approver → Approve
8. Check if document status = "approved"

**Test with**:
- Admin user (can see all)
- Regular user (can only see assigned)
- Different approver types (user/role/department)

---

## 🛠️ Development Setup

### Start Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: License Server (optional)
cd license-server
npm run dev
```

**URLs**:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- License Server: http://localhost:3001

### Test Accounts
```
Admin:
- Email: admin@acme.local
- Password: password123

Regular User:
- Email: user@acme.local
- Password: password123
```

---

## 📚 Important Files

### Backend
```
backend/src/modules/workflows/
  ├── workflows.controller.ts    # API endpoints
  ├── workflows.service.ts       # Business logic
  ├── workflows.repository.ts    # Database queries
  └── workflows.routes.ts        # Route definitions

backend/src/modules/approvals/
  ├── approvals.controller.ts
  ├── approvals.service.ts
  ├── approvals.repository.ts
  └── approvals.routes.ts

backend/prisma/schema.prisma     # Database schema
```

### Frontend
```
frontend/app/(dashboard)/
  ├── workflows/page.tsx         # Workflows management
  ├── approvals/page.tsx         # Approvals page
  ├── documents/page.tsx         # Documents page
  └── document-types/page.tsx    # Document types

frontend/components/ui/          # Reusable components
frontend/lib/types.ts            # TypeScript types
```

### Documentation
```
docs/dev/
  ├── PHASE-2-PLAN.md                    # Overall plan
  ├── SESSION-2025-11-20-PHASE-2-DAY6-START.md  # Latest session
  └── PHASE-1-COMPLETE-REPORT.md         # Phase 1 summary

ROADMAP-E-OFFICE.md              # 7-phase roadmap
ERD.md                           # Database schema
FUNCTIONAL_SPEC.md               # Requirements
```

---

## 🎨 UI/UX Guidelines

### Design System
- **Framework**: Next.js 14 + Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: lucide-react
- **Notifications**: sonner (toast)
- **State**: React Query

### Component Patterns
```tsx
// Example: Workflow Builder Modal
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Thêm bước phê duyệt</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label>Tên bước *</Label>
          <Input placeholder="VD: Phê duyệt cấp 1" />
        </div>
        <div>
          <Label>Loại người phê duyệt *</Label>
          <select className="...">
            <option value="user">Người dùng</option>
            <option value="role">Vai trò</option>
            <option value="department">Phòng ban</option>
            <option value="manager">Quản lý</option>
          </select>
        </div>
        {/* Conditional approver selector */}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit">Lưu</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### Reference Pages
- **Best example**: `frontend/app/(dashboard)/document-types/page.tsx`
- **CRUD pattern**: `frontend/app/(dashboard)/roles/page.tsx`
- **List + Detail**: `frontend/app/(dashboard)/documents/page.tsx`

---

## 🐛 Common Issues & Solutions

### Issue 1: UTF-8 Encoding Errors
**Symptom**: "stream did not contain valid UTF-8"  
**Solution**: Remove unused imports, ensure file saved as UTF-8

### Issue 2: React Query Cache
**Symptom**: Data not updating after mutation  
**Solution**: 
```tsx
queryClient.invalidateQueries({ queryKey: ['workflows'] });
```

### Issue 3: Next.js Build Errors
**Symptom**: "default export is not a React Component"  
**Solution**: Clear cache and restart
```bash
cd frontend
rm -rf .next
npm run dev
```

### Issue 4: 401 Unauthorized
**Symptom**: API calls fail with 401  
**Solution**: Check token in localStorage, re-login if needed

---

## 📝 Testing Checklist

### Workflows
- [ ] Create workflow
- [ ] Edit workflow name/description
- [ ] Delete workflow
- [ ] Add step to workflow
- [ ] Edit step
- [ ] Delete step
- [ ] Reorder steps (up/down)
- [ ] Assign workflow to document type

### Approvals
- [ ] Submit document for approval
- [ ] View pending approvals
- [ ] Approve document
- [ ] Reject document
- [ ] Request more info
- [ ] View approval history
- [ ] Multi-step workflow (2-3 steps)
- [ ] Different approver types

### Edge Cases
- [ ] Delete workflow with active instances
- [ ] Submit document without workflow
- [ ] Approve as non-approver (should fail)
- [ ] Reorder steps in active workflow

---

## 🚀 Deployment Notes

### Environment Variables
```bash
# Backend (.env)
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
SMTP_HOST="..."
SMTP_USER="..."
SMTP_PASS="..."

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"

# License Server (.env)
LICENSE_SIGNING_SECRET="..."
```

### Database Migration
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run seed  # Seed initial data
```

---

## 📞 Support

### Documentation
- **Main README**: `README.md`
- **Quick Start**: `QUICK-START.md`
- **Testing Guide**: `TEST-GUIDE.md`
- **API Tests**: `test-workflows.http`, `test-approvals.http`

### Code References
- **Backend API**: Check `test-workflows.http` for examples
- **Frontend Components**: Check `document-types/page.tsx` for patterns
- **Database Schema**: Check `backend/prisma/schema.prisma`

### Questions?
- Check `agents.md` for session history
- Check `docs/dev/` for detailed reports
- Check `LESSONS-LEARNED.md` for common pitfalls

---

## 🎯 Success Criteria

**Phase 2 Week 2 is complete when**:
1. ✅ Can create workflow with multiple steps
2. ✅ Can assign workflow to document type
3. ✅ Can submit document for approval
4. ✅ Can approve/reject documents
5. ✅ Multi-step workflow works end-to-end
6. ✅ Approval history displays correctly
7. ✅ All CRUD operations work
8. ✅ No console errors
9. ✅ UI is responsive and user-friendly
10. ✅ Code is committed to Git

---

## 📅 Timeline

**Estimated**: 6-8 hours total

- **Day 1 (3-4 hours)**: Workflow Builder + Assign to Document Type
- **Day 2 (3-4 hours)**: Approvals UI + Submit Document
- **Day 3 (1-2 hours)**: Testing + Bug Fixes

**Target Completion**: End of Phase 2 Week 2

---

## 🎉 Good Luck!

You're picking up a well-structured project with:
- ✅ Clean architecture
- ✅ Full backend API ready
- ✅ UI components library
- ✅ Comprehensive documentation
- ✅ Test data seeded

**Focus on**: Building the UI to connect existing backend APIs. Most of the hard work is done!

**Remember**: Check `LESSONS-LEARNED.md` before starting! 🚀

---

**Last Updated**: 2025-11-20  
**Next Review**: After Phase 2 Week 2 completion
