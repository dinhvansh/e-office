# Common Issues & Solutions

This document contains common issues encountered during development and their solutions.

## Environment Variables

### Missing Environment Variables

**Problem**: Application fails to start with error "environment variable is required".

**Symptoms**:
```
Error: NEXT_PUBLIC_API_BASE_URL environment variable is required
Error: NEXT_PUBLIC_API_URL environment variable is required
```

**Root Cause**: Environment variables are not set. The application **does not use localhost fallbacks** - all variables must be explicitly configured.

**Solution**:

Frontend:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Backend:
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm run dev
```

**Reference**: `docs/dev/ENVIRONMENT-VARIABLES-REQUIRED.md`

---

## CORS Issues

### Custom Headers in Fetch Requests

**Problem**: Frontend fetch requests with custom headers (beyond `Content-Type` and `Authorization`) trigger CORS preflight checks that fail.

**Symptoms**:
```
Access to fetch at 'http://localhost:4000/api/v1/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Request header field [header-name] is not allowed 
by Access-Control-Allow-Headers in preflight response.
```

**Root Cause**: Backend CORS config doesn't include the custom headers in `allowedHeaders` array.

**Solution**: Add custom headers to CORS config in `backend/src/app.ts`:

```typescript
cors({
  origin: (origin, callback) => { /* ... */ },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    // Add any custom headers here:
    'Cache-Control',
    'Pragma',
    'Expires',
    // etc.
  ],
})
```

**Best Practice**: 
- Minimize custom headers in requests
- Prefer server-side response headers over client-side request headers
- Only send essential headers (usually just `Authorization` for authenticated requests)

**Reference**: `docs/dev/FIX-PROGRESSIVE-PDF-DISPLAY-CORS.md`

---

## PDF Display Issues

### Progressive PDF Not Updating

**Problem**: Document flow page doesn't show updated PDF after signatures are added.

**Checklist**:
1. ✅ Backend generates progressive PDF correctly
2. ✅ Database `signed_file_path` is updated
3. ✅ API endpoint returns `signed_file_path` in response
4. ✅ Frontend detects `signed_file_path` and switches to `view-signed` endpoint
5. ✅ CORS allows necessary headers
6. ✅ Browser cache is busted with timestamp query param

**Common Causes**:
- API response missing `signed_file_path` field
- CORS blocking fetch request (see above)
- Browser caching old PDF (add `?t=${timestamp}` to URL)
- React Query caching old data (use `refetchInterval` or manual `refetch()`)

**Reference**: `docs/dev/FIX-PROGRESSIVE-PDF-DISPLAY-CORS.md`

---

## Authentication Issues

### Invalid Credentials

**Problem**: Login fails with "Invalid credentials" error.

**Common Causes**:
1. Wrong password - check with `node backend/scripts/check-admin-user.js`
2. User not active - check `status` field in database
3. Wrong tenant - ensure user belongs to correct tenant

**Default Credentials**:
- Email: `admin@acme.local`
- Password: `admin123` (not `Admin@123`)

---

## Database Issues

### Missing Data After Seeding

**Problem**: Seeded data doesn't appear in application.

**Solution**: Run seeds in correct order:
```bash
cd backend
node scripts/seed-rbac.js              # 1. Roles & permissions first
node scripts/seed-document-types.js    # 2. Document types
node scripts/seed-workflows-simple.js  # 3. Workflows
node scripts/seed-org-final.js         # 4. Organization data
```

**Check Data**:
```bash
node scripts/check-db-data.js
node scripts/check-admin-user.js
node scripts/check-user-permissions.js
```

---

## Development Workflow

### Backend Not Reloading

**Problem**: Code changes don't reflect in running backend.

**Solution**:
1. Check if `ts-node-dev` is running (should see "Backend listening on port 4000")
2. Check for TypeScript errors in console
3. Restart backend: Stop process and run `npm run dev` again

### Frontend Not Updating

**Problem**: UI changes don't appear.

**Solution**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check Next.js console for build errors
4. Restart frontend dev server if needed

---

## Testing

### Script Fails with "Cannot find module"

**Problem**: Test script can't find dependencies.

**Solution**:
```bash
cd backend
npm install
```

### Script Fails with Database Error

**Problem**: Script can't connect to database.

**Solution**:
1. Check PostgreSQL is running
2. Check `.env` file has correct `DATABASE_URL`
3. Run `npx prisma generate` to regenerate Prisma client

---

## Quick Debugging Commands

```bash
# Check backend is running
curl http://localhost:4000/health

# Check frontend is running
curl http://localhost:3000

# Check database connection
cd backend && npx prisma studio

# Check user permissions
node backend/scripts/check-user-permissions.js

# Check document data
node backend/scripts/check-document-030.js

# Test API endpoint
node backend/scripts/test-flow-endpoint-82.js
```

---

## When to Update This Document

Add new sections when you encounter:
- Recurring issues that take >15 minutes to debug
- Issues that require non-obvious solutions
- Issues that affect multiple developers
- Issues related to environment setup or configuration

Keep solutions concise and actionable.
