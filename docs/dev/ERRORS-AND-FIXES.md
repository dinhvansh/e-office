# Errors and Fixes Log

**Purpose**: Ghi lại tất cả các lỗi đã gặp và cách khắc phục để tránh lặp lại

---

## 2025-11-22 - Session Errors

### Error 1: Prisma File Lock (EPERM)
**Time**: 00:11:49  
**Error**: 
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp' -> 'query_engine-windows.dll.node'
```

**Cause**: Backend server đang chạy và lock Prisma files

**Solution**:
```bash
# Stop backend server first
# Then run prisma commands
npx prisma generate
npx prisma db push
```

**Prevention**: Always stop backend before running Prisma commands

---

### Error 2: Duplicate Variable Declaration
**Time**: 00:35:02  
**Error**:
```
SyntaxError: Identifier 'document' has already been declared
```

**Location**: `backend/src/modules/approvals/approvals.service.ts:210`

**Cause**: Declared `const document` twice in same scope

**Solution**: Remove duplicate declaration, reuse first variable

**Code Fix**:
```typescript
// ❌ Before
const document = await prisma.documents.findUnique({ ... });
// ... some code ...
const document = await prisma.documents.findUnique({ ... }); // Duplicate!

// ✅ After
const document = await prisma.documents.findUnique({ ... });
// ... some code ...
// Reuse 'document' variable, no redeclaration
```

---

### Error 3: workFlow.is_active TypeError
**Time**: 00:40:15  
**Error**:
```
TypeError: workFlow.filter is not a function
Unhandled Runtime Error: workFlow.is_active
```

**Location**: `frontend/app/(dashboard)/documents/page.tsx`

**Cause**: 
1. `workflowsData` might not be an array
2. Response structure nested: `{ workflow: { ... } }` instead of flat object

**Solution**:
```typescript
// ❌ Before
const { data: workflowsData } = useQuery({
  queryFn: async () => {
    const data = await fetchJson<{ workflows: any[] }>("/workflows");
    return data.workflows;
  },
});
const activeWorkflows = workflowsData?.filter((wf) => wf.is_active) || [];

// ✅ After
const { data: workflowsData } = useQuery({
  queryFn: async () => {
    const data: any = await fetchJson("/workflows");
    return Array.isArray(data) ? data : (data?.workflows || []);
  },
});
const activeWorkflows = Array.isArray(workflowsData) 
  ? workflowsData.filter((wf) => wf.is_active) 
  : [];
```

---

### Error 4: Nested Response Structure in Workflow Components
**Time**: 00:42:30  
**Error**:
```
TypeError: Cannot read property 'is_active' of undefined
workFlow.workflow.steps causing errors
```

**Location**: 
- `frontend/components/workflow/WorkflowPreview.tsx`
- `frontend/components/workflow/WorkflowCustomizer.tsx`

**Cause**: API returns nested structure `{ workflow: { steps: [...] } }` but code expects flat `{ steps: [...] }`

**Solution**: Unwrap nested response

**Code Fix**:
```typescript
// ❌ Before
const { data: workflow } = useQuery({
  queryFn: () => fetchJson(`/workflows/${workflowId}`),
});
const steps = workflow?.workflow?.steps || []; // Nested access

// ✅ After
const { data: workflowData } = useQuery({
  queryFn: async () => {
    const data: any = await fetchJson(`/workflows/${workflowId}`);
    return data?.workflow || data; // Unwrap
  },
});
const steps = workflowData?.steps || []; // Direct access
```

**Files Fixed**:
- `frontend/components/workflow/WorkflowPreview.tsx`
- `frontend/components/workflow/WorkflowCustomizer.tsx`
- `frontend/app/(dashboard)/documents/page.tsx`

---

## Common Patterns

### Pattern 1: Always Check Array Before Filter
```typescript
// ❌ Bad
const filtered = data?.filter(item => item.active);

// ✅ Good
const filtered = Array.isArray(data) ? data.filter(item => item.active) : [];
```

### Pattern 2: Handle Nested API Responses
```typescript
// ✅ Unwrap in queryFn
const { data } = useQuery({
  queryFn: async () => {
    const response: any = await fetchJson('/api/endpoint');
    // Handle both flat and nested
    return response?.data || response;
  },
});
```

### Pattern 3: Stop Services Before Schema Changes
```bash
# Always do this before prisma commands
1. Stop backend: Ctrl+C or stop-all.ps1
2. Run prisma generate
3. Run prisma db push
4. Restart backend: start-all.ps1
```

### Pattern 4: Avoid Variable Redeclaration
```typescript
// ❌ Bad
const user = await getUser();
// ... 50 lines later ...
const user = await getAnotherUser(); // Error!

// ✅ Good
const user = await getUser();
// ... 50 lines later ...
const anotherUser = await getAnotherUser(); // Different name
```

---

## TypeScript Errors

### Error: Property does not exist on type
**Solution**: Add proper typing or use `any` with caution

```typescript
// ❌ Error
const data = await fetchJson('/api');
const items = data.items; // Error: Property 'items' does not exist

// ✅ Fix 1: Type assertion
const data: any = await fetchJson('/api');
const items = data.items;

// ✅ Fix 2: Proper interface
interface ApiResponse {
  items: Item[];
}
const data = await fetchJson<ApiResponse>('/api');
const items = data.items;
```

---

## React Query Errors

### Error: onSuccess is deprecated in v5
**Solution**: Use `useEffect` instead

```typescript
// ❌ Deprecated
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onSuccess: (data) => {
    setLocalState(data);
  },
});

// ✅ Use useEffect
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});

useEffect(() => {
  if (data) {
    setLocalState(data);
  }
}, [data]);
```

---

## Database Errors

### Error: Unique constraint violation
**Cause**: Trying to insert duplicate value in unique field

**Solution**: 
1. Check existing data first
2. Use `upsert` instead of `create`
3. Add `--accept-data-loss` flag if intentional

```bash
npx prisma db push --accept-data-loss
```

---

## Best Practices Learned

### 1. Response Structure Consistency
- Always document API response structure
- Handle both nested and flat responses
- Use type guards for arrays

### 2. Error Handling
- Add try-catch for async operations
- Log errors to console for debugging
- Show user-friendly error messages

### 3. Development Workflow
- Stop services before schema changes
- Test incrementally after each change
- Use TypeScript diagnostics tool

### 4. Code Quality
- Avoid variable redeclaration
- Use meaningful variable names
- Add comments for complex logic

---

## Quick Reference

### Check for Errors
```bash
# TypeScript diagnostics
# Use getDiagnostics tool in Kiro

# Backend logs
# Check process output

# Frontend console
# Open browser DevTools
```

### Common Fixes
```typescript
// Array check
Array.isArray(data) ? data : []

// Nested response
data?.nested || data

// Type assertion
const typed: any = data

// Optional chaining
data?.property?.nested
```

---

## Update Log

- **2025-11-22 00:45**: Added 4 errors from workflow integration session
- **2025-11-22 00:50**: Added common patterns and best practices

---

**Note**: Cập nhật file này mỗi khi gặp lỗi mới để tạo knowledge base!

