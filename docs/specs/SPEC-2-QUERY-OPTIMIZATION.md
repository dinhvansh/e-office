# SPEC-2: Query Optimization

## 📋 Overview
Optimize database queries to eliminate N+1 problems and improve performance.

**Priority**: HIGH  
**Estimated Time**: 2 days  
**Impact**: 5-10x faster query execution

---

## 🎯 Goals
- Eliminate N+1 query problems
- Batch load related data
- Optimize workflow step enrichment
- Add proper database indexes

---

## 📝 Task Breakdown

### Task 2.1: Fix Workflow Service N+1 Problem (4 hours)

**File**: `backend/src/modules/workflows/workflows.service.ts`

**Current Problem** (line 18-98):
```typescript
// ❌ BAD: N+1 queries
for (const step of workflow.steps) {
  if (step.approver_type === 'user') {
    const user = await prisma.users.findUnique(...); // N queries!
  }
  // ... similar for role, department
}
```

**Optimized Solution**:
```typescript
// ✅ GOOD: Batch loading
async enrichWorkflowSteps(workflow: any) {
  const steps = workflow.steps || [];
  
  // 1. Collect all IDs by type
  const userIds = steps
    .filter(s => s.approver_type === 'user')
    .map(s => s.approver_id)
    .filter(Boolean);
  
  const roleIds = steps
    .filter(s => s.approver_type === 'role')
    .map(s => s.approver_id)
    .filter(Boolean);
  
  const deptIds = steps
    .filter(s => s.approver_type === 'department')
    .map(s => s.approver_id)
    .filter(Boolean);
  
  // 2. Batch load all data (3 queries instead of N)
  const [users, roles, departments] = await Promise.all([
    prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, full_name: true }
    }),
    prisma.roles.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true }
    }),
    prisma.departments.findMany({
      where: { id: { in: deptIds } },
      include: { manager: { select: { email: true, full_name: true } } }
    })
  ]);
  
  // 3. Create lookup maps
  const userMap = new Map(users.map(u => [u.id, u]));
  const roleMap = new Map(roles.map(r => [r.id, r]));
  const deptMap = new Map(departments.map(d => [d.id, d]));
  
  // 4. Enrich steps (no queries)
  return steps.map(step => {
    let approverName = '';
    let approverEmail = '';
    
    if (step.approver_type === 'user') {
      const user = userMap.get(step.approver_id);
      if (user) {
        approverName = user.full_name || user.email;
        approverEmail = user.email;
      }
    } else if (step.approver_type === 'role') {
      const role = roleMap.get(step.approver_id);
      if (role) {
        approverName = `Vai trò: ${role.name}`;
      }
    } else if (step.approver_type === 'department') {
      const dept = deptMap.get(step.approver_id);
      if (dept?.manager) {
        approverName = dept.manager.full_name || dept.manager.email;
        approverEmail = dept.manager.email;
      }
    }
    
    return {
      ...step,
      approver_name: approverName,
      approver_email: approverEmail
    };
  });
}
```

**Performance Improvement**:
- Before: 1 + N queries (N = number of steps)
- After: 3 queries total
- For 10 steps: 11 queries → 3 queries = **73% reduction**

**Acceptance Criteria**:
- ✅ Workflow enrichment uses batch loading
- ✅ Performance: <50ms for 10-step workflow
- ✅ Tests verify correct data mapping
- ✅ No regression in functionality

---

### Task 2.2: Optimize Document List Query (3 hours)

**File**: `backend/src/modules/documents/documents.repository.ts`

**Current Issue**: Missing select/include optimization

**Optimized Query**:
```typescript
async listByTenantPaginated(
  tenantId: number,
  pagination: { page: number; limit: number },
  noSigningOnly = false
) {
  const skip = (pagination.page - 1) * pagination.limit;
  
  const where: any = { tenant_id: tenantId };
  if (noSigningOnly) {
    where.sign_request_id = null;
  }
  
  const [documents, total] = await Promise.all([
    prisma.documents.findMany({
      where,
      skip,
      take: pagination.limit,
      orderBy: { created_at: 'desc' },
      // ✅ Only select needed fields
      select: {
        id: true,
        title: true,
        document_number: true,
        status: true,
        created_at: true,
        original_file_name: true,
        // Include minimal relations
        owner: {
          select: { id: true, full_name: true, email: true }
        },
        document_type: {
          select: { id: true, name: true, code: true }
        },
        department: {
          select: { id: true, name: true }
        }
        // Don't include: tags, permissions, versions (load separately if needed)
      }
    }),
    prisma.documents.count({ where })
  ]);
  
  return {
    data: documents,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}
```

**Acceptance Criteria**:
- ✅ Only necessary fields selected
- ✅ Response payload size reduced by ~50%
- ✅ Query time <100ms for 100 documents

---

### Task 2.3: Add Database Indexes (2 hours)

**File**: `backend/prisma/migrations/add-performance-indexes.sql`

```sql
-- Documents table
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Document approvals
CREATE INDEX IF NOT EXISTS idx_approvals_action ON document_approvals(action);
CREATE INDEX IF NOT EXISTS idx_approvals_doc_status ON document_approvals(document_id, action);

-- Signers
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);
CREATE INDEX IF NOT EXISTS idx_signers_email ON signers(email);

-- Workflow instances
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_doc ON workflow_instances(document_id);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_doc_event ON audit_logs(document_id, event);
```

**Prisma Schema Updates**:
```prisma
model documents {
  // ... existing fields
  
  @@index([status])
  @@index([owner_id])
  @@index([tenant_id, status])
  @@index([created_at(sort: Desc)])
}

model document_approvals {
  // ... existing fields
  
  @@index([action])
  @@index([document_id, action])
}

model signers {
  // ... existing fields
  
  @@index([status])
  @@index([email])
}
```

**Deployment**:
```bash
cd backend
npx prisma migrate dev --name add_performance_indexes
npx prisma generate
```

**Acceptance Criteria**:
- ✅ 8 new indexes created
- ✅ Query execution plans verified
- ✅ No performance regression
- ✅ Index usage monitored

---

### Task 2.4: Optimize Approval Flow Query (3 hours)

**File**: `backend/src/modules/approvals/approvals.service.ts`

**Issue**: Loading unnecessary data for approval list

**Optimized**:
```typescript
async getMyPendingApprovals(userId: number, tenantId: number) {
  return prisma.document_approvals.findMany({
    where: {
      approver_user_id: userId,
      action: 'pending',
      document: {
        tenant_id: tenantId
      }
    },
    // ✅ Minimal select
    select: {
      id: true,
      action: true,
      due_date: true,
      created_at: true,
      document: {
        select: {
          id: true,
          title: true,
          document_number: true,
          status: true,
          owner: {
            select: { full_name: true, email: true }
          }
        }
      },
      workflow_step: {
        select: {
          step_name: true,
          step_order: true
        }
      }
    },
    orderBy: { due_date: 'asc' }
  });
}
```

---

## 🧪 Testing Plan

### Performance Tests
```typescript
describe('Query Performance', () => {
  it('workflow enrichment should complete in <100ms', async () => {
    const start = Date.now();
    await workflowsService.getWorkflow(1, 1);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('document list should handle 1000 records efficiently');
  it('approval query should use index');
});
```

### Query Analysis
```sql
-- Verify index usage
EXPLAIN ANALYZE SELECT * FROM documents WHERE status = 'active';
EXPLAIN ANALYZE SELECT * FROM document_approvals WHERE action = 'pending';
```

---

## 📊 Success Metrics

- **Workflow Enrichment**: 500ms → 50ms (10x faster)
- **Document List**: 300ms → 100ms (3x faster)
- **Query Count**: -73% (N+1 eliminated)
- **Database CPU**: -40%

---

## 🚀 Deployment Checklist

- [ ] Code changes reviewed
- [ ] Database indexes applied
- [ ] Performance tests passing
- [ ] Query monitoring enabled
- [ ] Rollback plan prepared
