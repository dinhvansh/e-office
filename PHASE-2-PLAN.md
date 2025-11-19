# 📋 Phase 2: Workflow Engine - Detailed Plan

**Duration**: 2 weeks (Week 3-4)  
**Goal**: Multi-step approval workflow system  
**Status**: 🔜 Ready to Start

---

## 🎯 Objectives

Build a flexible workflow engine that supports:
1. Workflow templates (configurable approval steps)
2. Multi-step approval process
3. Conditional routing
4. Deadline tracking & reminders
5. Approval actions (Approve/Reject/RequestInfo)
6. Workflow history & audit trail

---

## 📊 Phase 1 Recap (Completed ✅)

**What we have now**:
- ✅ Document types (8 types)
- ✅ Auto-numbering system
- ✅ External organizations
- ✅ Document tags, permissions, versions
- ✅ RBAC system (users, departments, roles)
- ✅ Stable backend + frontend

**Foundation ready for workflows!**

---

## 🗄️ Database Schema (Phase 2)

### New Tables Needed:

#### 1. workflows
```sql
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type_id INT,  -- Optional: specific to doc type
  is_active BOOLEAN DEFAULT true,
  created_by INT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (document_type_id) REFERENCES document_types(id)
);
```

#### 2. workflow_steps
```sql
CREATE TABLE workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_id INT NOT NULL,
  step_order INT NOT NULL,
  step_name VARCHAR(255),
  approver_type VARCHAR(50),  -- 'user', 'role', 'department', 'manager'
  approver_id INT,  -- user_id, role_id, or department_id
  due_in_days INT DEFAULT 3,
  is_required BOOLEAN DEFAULT true,
  conditions JSONB,  -- For conditional routing
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);
```

#### 3. document_approvals
```sql
CREATE TABLE document_approvals (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL,
  workflow_id INT NOT NULL,
  workflow_step_id INT NOT NULL,
  approver_user_id INT NOT NULL,
  action VARCHAR(50),  -- 'pending', 'approved', 'rejected', 'request_info'
  comment TEXT,
  acted_at TIMESTAMP,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id),
  FOREIGN KEY (approver_user_id) REFERENCES users(id)
);
```

#### 4. workflow_instances
```sql
CREATE TABLE workflow_instances (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL,
  workflow_id INT NOT NULL,
  current_step_id INT,
  status VARCHAR(50),  -- 'in_progress', 'completed', 'rejected', 'cancelled'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  FOREIGN KEY (current_step_id) REFERENCES workflow_steps(id)
);
```

---

## 📅 Week 1: Backend Implementation

### Day 1-2: Database & Workflow Module

**Tasks**:
1. Update Prisma schema with 4 new tables
2. Run migration: `npx prisma migrate dev --name add_workflow_engine`
3. Create seed script with sample workflows

**Deliverables**:
- `backend/prisma/schema.prisma` updated
- `backend/scripts/seed-workflows.js`
- 3 sample workflows seeded

### Day 3-4: Workflow Service

**Create**: `backend/src/modules/workflows/`

**Files**:
1. `workflows.repository.ts`
   - CRUD for workflows
   - CRUD for workflow steps
   - Get workflow by document type

2. `workflows.service.ts`
   - Create workflow template
   - Add/Remove/Reorder steps
   - Validate workflow configuration
   - Get available approvers

3. `workflows.controller.ts`
   - API endpoints for workflow management

4. `workflows.routes.ts`
   - Routes with permission guards

**API Endpoints**:
```
GET    /api/v1/workflows
GET    /api/v1/workflows/:id
POST   /api/v1/workflows
PUT    /api/v1/workflows/:id
DELETE /api/v1/workflows/:id
GET    /api/v1/workflows/:id/steps
POST   /api/v1/workflows/:id/steps
PUT    /api/v1/workflows/steps/:stepId
DELETE /api/v1/workflows/steps/:stepId
```

### Day 5: Approval Service

**Create**: `backend/src/modules/approvals/`

**Files**:
1. `approvals.repository.ts`
   - Create approval records
   - Get pending approvals
   - Get approval history

2. `approvals.service.ts`
   - **submitForApproval(documentId, workflowId)**
     - Create workflow instance
     - Determine first approver(s)
     - Create approval records
     - Send notifications
   
   - **approve(approvalId, userId, comment)**
     - Validate approver
     - Update approval record
     - Move to next step or complete
     - Send notifications
   
   - **reject(approvalId, userId, comment)**
     - Update approval record
     - Set document status to rejected
     - Notify creator
   
   - **requestMoreInfo(approvalId, userId, comment)**
     - Update approval record
     - Notify creator
     - Pause workflow

3. `approvals.controller.ts`
4. `approvals.routes.ts`

**API Endpoints**:
```
POST   /api/v1/approvals/submit
POST   /api/v1/approvals/:id/approve
POST   /api/v1/approvals/:id/reject
POST   /api/v1/approvals/:id/request-info
GET    /api/v1/approvals/my-pending
GET    /api/v1/approvals/document/:documentId
```

---

## 📅 Week 2: Frontend & Integration

### Day 6-7: Workflow Management UI

**Create**: `frontend/app/(dashboard)/workflows/`

**Pages**:
1. `page.tsx` - Workflow list
   - List all workflows
   - Filter by document type
   - Active/Inactive toggle
   - Create/Edit/Delete actions

2. `[id]/page.tsx` - Workflow detail
   - View workflow steps
   - Visual step flow
   - Edit steps
   - Reorder steps

3. `[id]/builder/page.tsx` - Workflow builder
   - Drag-drop step builder
   - Configure approvers
   - Set deadlines
   - Add conditions

**Components**:
- `WorkflowCard.tsx`
- `WorkflowStepList.tsx`
- `ApproverSelector.tsx`
- `WorkflowBuilder.tsx` (drag-drop)

### Day 8-9: Approval UI

**Create**: `frontend/app/(dashboard)/approvals/`

**Pages**:
1. `page.tsx` - My Approvals
   - Pending approvals list
   - Filter by document type
   - Sort by due date
   - Quick approve/reject

2. `[id]/page.tsx` - Approval Detail
   - Document preview
   - Approval history
   - Approve/Reject/Request Info buttons
   - Comment form

**Update**: `frontend/app/(dashboard)/documents/[id]/page.tsx`
- Add "Submit for Approval" button
- Show workflow status
- Display approval progress
- Show approval history

### Day 10: Testing & Integration

**Backend Tests**:
- Workflow CRUD
- Approval flow (submit → approve → complete)
- Rejection flow
- Request info flow
- Deadline calculation

**Frontend Tests**:
- Workflow management UI
- Approval actions
- Document submission

**Integration Tests**:
- End-to-end approval flow
- Multi-step workflow
- Conditional routing

---

## 🎯 Success Criteria

### Must Have:
- [x] Workflow templates CRUD
- [x] Workflow steps configuration
- [x] Submit document for approval
- [x] Approve/Reject/Request Info actions
- [x] Approval history tracking
- [x] My pending approvals page
- [x] Email notifications

### Should Have:
- [x] Deadline tracking
- [x] Overdue alerts
- [x] Workflow builder UI
- [x] Visual workflow display

### Nice to Have:
- [ ] Conditional routing (complex)
- [ ] Parallel approvals
- [ ] Approval delegation
- [ ] Workflow analytics

---

## 📊 Estimated Effort

| Task | Time |
|------|------|
| Database schema | 2 hours |
| Workflow module | 4 hours |
| Approval service | 4 hours |
| Frontend UI | 6 hours |
| Testing | 4 hours |
| **Total** | **20 hours** |

**Timeline**: 2 weeks (10 hours/week)

---

## 🔗 Dependencies

**Requires** (from Phase 1):
- ✅ Document types
- ✅ Users, Departments, Roles
- ✅ Email service
- ✅ Permissions system

**Provides** (for Phase 3+):
- Workflow engine
- Approval tracking
- Notification system

---

## 📝 Sample Workflows

### 1. Simple Approval (1 step)
```
Document → Manager Approval → Approved
```

### 2. Two-Step Approval
```
Document → Department Manager → Director → Approved
```

### 3. Conditional Approval
```
Document → IF amount > 100M
           THEN: CFO Approval
           ELSE: Manager Approval
         → Approved
```

### 4. Parallel Approval
```
Document → [Legal Review + Finance Review] → Director → Approved
```

---

## 🚀 Getting Started

### Step 1: Read Documentation
- FUNCTIONAL_SPEC.md (Section on Workflow)
- ERD.md (Workflow tables)
- PHASE-1-COMPLETE-REPORT.md (What's available)

### Step 2: Update Schema
```bash
cd backend
# Edit prisma/schema.prisma
npx prisma migrate dev --name add_workflow_engine
npx prisma generate
```

### Step 3: Create Modules
```bash
# Create workflow module
mkdir -p backend/src/modules/workflows
# Create files...
```

### Step 4: Test
```bash
# Run backend
npm run dev

# Test APIs
# Use test-api.http
```

---

## 📚 Reference

**Similar Systems**:
- Jira Workflow
- SharePoint Approval
- Odoo Workflow

**Key Concepts**:
- State machine
- Approval chain
- Conditional routing
- Deadline management

---

**Ready to start Phase 2!** 🚀

**Next**: Create workflow database schema
