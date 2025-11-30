# Ultra-Minimal Version - Quick Reference

## ✅ Decision: Build From Core (RECOMMENDED)

### Why?
- ⏰ **10x faster**: 2-3 days vs 2-3 weeks
- 💰 **Lower cost**: Reuse proven code
- 🔒 **More stable**: Already tested
- 📈 **Upgrade path**: Users can grow

---

## 🚀 Quick Start

### 1. Run Cleanup Script
```bash
bash scripts/create-ultra-minimal.sh
```

### 2. Apply Database Migration
```bash
cd backend
psql eoffice_dev < prisma/migrations/ultra-minimal.sql
npx prisma generate
```

### 3. Update Router
Edit `backend/src/router/index.ts`:
```typescript
// Remove these imports
// import workflowsRouter from '../modules/workflows/workflows.routes';
// import approvalsRouter from '../modules/approvals/approvals.routes';
// ... etc

// Remove these routes
// router.use('/workflows', workflowsRouter);
// router.use('/approvals', approvalsRouter);
// ... etc
```

### 4. Update Frontend Navigation
Edit `frontend/components/Sidebar.tsx`:
```typescript
const navigation = [
  { name: 'Documents', href: '/documents', icon: DocumentIcon },
  { name: 'Sign Requests', href: '/sign-requests', icon: PenIcon },
  // Remove: Workflows, Approvals, Departments, Roles, etc.
];
```

### 5. Test
```bash
# Start dev server
docker-compose -f docker-compose.dev.yml up -d

# Test these flows:
1. Upload document
2. Add signature fields
3. Send for signing
4. Sign document
5. Download signed PDF
```

### 6. Build & Deploy
```bash
bash scripts/deploy.sh
```

---

## 📊 What Gets Removed?

### Backend (9 modules)
- ❌ workflows/
- ❌ approvals/
- ❌ departments/
- ❌ positions/
- ❌ roles/
- ❌ permissions/
- ❌ documentTypes/
- ❌ numbering/
- ❌ external-orgs/

### Frontend (7 pages)
- ❌ /workflows
- ❌ /my-approvals
- ❌ /departments
- ❌ /positions
- ❌ /roles
- ❌ /permissions
- ❌ /document-types

### Database (16 tables)
- ❌ workflows, workflow_steps, workflow_instances
- ❌ document_approvals
- ❌ roles, permissions, user_roles, role_permissions
- ❌ departments, positions
- ❌ document_types, numbering_rules
- ❌ external_organizations
- ❌ document_permissions, document_versions, document_tags
- ❌ document_cc_emails, document_attachments

---

## ✅ What Remains?

### Backend (6 modules)
- ✅ auth/
- ✅ users/
- ✅ documents/
- ✅ signRequests/
- ✅ signers/
- ✅ audit/

### Frontend (3 pages)
- ✅ /dashboard
- ✅ /documents
- ✅ /sign-requests

### Database (8 tables)
- ✅ tenants
- ✅ users
- ✅ documents
- ✅ sign_requests
- ✅ signers
- ✅ sign_request_fields
- ✅ sign_request_field_values
- ✅ audit_logs

---

## 📋 Checklist

### Before Starting
- [ ] Backup database: `bash scripts/backup-db.sh`
- [ ] Commit current work: `git commit -am "Checkpoint before ultra-minimal"`
- [ ] Review SPEC-8 for full details

### Execution
- [ ] Run cleanup script
- [ ] Apply database migration
- [ ] Update backend router
- [ ] Update frontend navigation
- [ ] Remove unused imports
- [ ] Test all core flows

### After Cleanup
- [ ] Review git diff
- [ ] Run tests
- [ ] Build Docker images
- [ ] Deploy to staging
- [ ] User acceptance testing

---

## 🎯 Result

**From**:
- 20+ database tables
- 20 backend modules
- 15+ frontend pages
- 2 giờ setup time

**To**:
- 8 database tables (-60%)
- 6 backend modules (-70%)
- 3 frontend pages (-80%)
- 2 phút setup time (-94%)

**Perfect for**: Freelancers, small teams, quick signatures

**Pricing**: $5/user/month (competitive vs DocuSign $25/user)

---

## 📚 References

- Full spec: `docs/specs/SPEC-8-ULTRA-MINIMAL.md`
- Cleanup script: `scripts/create-ultra-minimal.sh`
- SQL migration: `backend/prisma/migrations/ultra-minimal.sql`
