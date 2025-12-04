# Environment Variables - No Fallback Policy

**Date**: 2025-12-04  
**Status**: ✅ Complete

## Overview

All localhost fallbacks have been removed from the codebase. The application now **requires** environment variables to be explicitly set - no default values are provided.

## Rationale

1. **Security**: Prevents accidental deployment with development URLs
2. **Clarity**: Forces explicit configuration in all environments
3. **Production-Ready**: Ensures proper configuration before deployment
4. **Debugging**: Makes misconfiguration immediately obvious

## Changes Made

### Frontend Files Updated

1. **`frontend/lib/api.ts`**
   - Removed: `|| 'http://localhost:4000/api/v1'`
   - Now validates `NEXT_PUBLIC_API_URL` at runtime (not build time)
   - Throws error if variable is not set when API is used

2. **`frontend/components/providers/auth-provider.tsx`**
   - Removed: `DEFAULT_API_URL` constant
   - Removed: `?? DEFAULT_API_URL` fallback
   - Now validates `NEXT_PUBLIC_API_BASE_URL` at runtime (not build time)
   - Throws error if variable is not set when auth is used

3. **`frontend/app/sign/[token]/page.tsx`**
   - Removed: `|| 'http://localhost:4000'` fallbacks (6 instances)
   - Added validation checks before using env variables

4. **`frontend/app/(dashboard)/documents/[id]/flow/page.tsx`**
   - Removed: `|| 'http://localhost:4000/api/v1'` fallbacks (2 instances)
   - Added validation checks

5. **`frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`**
   - Removed: `|| 'http://localhost:4000'` fallback
   - Added validation check

6. **`frontend/playwright.config.ts`**
   - Removed: `?? "http://localhost:3000"` fallback
   - Now throws error if `PLAYWRIGHT_BASE_URL` is not set

7. **`frontend/tests/e2e.spec.ts`**
   - Removed: `?? "http://localhost:4000/api/v1"` fallback
   - Removed: `?? "admin@acme.local"` and `?? "secret123"` fallbacks
   - Now throws errors if test env variables are not set

### Configuration Files Created/Updated

1. **`frontend/.env.example`** (NEW)
   - Documents all required environment variables
   - Provides examples for development and production
   - Includes Playwright test variables

2. **`backend/.env.example`** (UPDATED)
   - Added comments emphasizing required variables
   - Clarified CORS_ORIGIN usage

## Required Environment Variables

### Frontend (`.env.local`)

```bash
# REQUIRED - Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# OPTIONAL - Only for E2E tests
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_API_BASE_URL=http://localhost:4000/api/v1
PLAYWRIGHT_EMAIL=admin@acme.local
PLAYWRIGHT_PASSWORD=admin123
```

### Backend (`.env`)

```bash
# REQUIRED
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/esign_db
JWT_SECRET=<32+ character secret>
REFRESH_TOKEN_SECRET=<32+ character secret>
CORS_ORIGIN=http://localhost:3000

# OPTIONAL
REDIS_URL=redis://localhost:6379
LICENSE_SERVER_URL=http://license-server:5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Error Messages

When environment variables are missing, users will see clear error messages:

```
Error: NEXT_PUBLIC_API_BASE_URL environment variable is required
Error: NEXT_PUBLIC_API_URL environment variable is required
Error: PLAYWRIGHT_BASE_URL environment variable is required
```

**Note**: Validation happens at **runtime** (when the API is actually used), not at build time. This allows the build to succeed even without environment variables, but the application will fail immediately when trying to make API calls if variables are not set.

## Migration Guide

### For Existing Developers

1. Copy `frontend/.env.example` to `frontend/.env.local`
2. Update values if needed (defaults work for local development)
3. Restart frontend dev server

### For New Developers

1. Follow setup instructions in `QUICK-START.md`
2. Copy `.env.example` files to `.env` and `.env.local`
3. Update values for your environment

### For Production Deployment

1. Set all required environment variables in your deployment platform
2. Use production URLs (no localhost)
3. Test configuration before deploying

## Testing

All changes have been applied. To verify:

```bash
# Frontend should fail without env vars
cd frontend
rm .env.local
npm run dev  # Should show error

# Restore env file
cp .env.example .env.local
npm run dev  # Should work
```

## Files Not Changed

The following files contain localhost references but are **intentionally kept**:

- Documentation files (`.md`)
- Test scripts in `backend/scripts/` (development tools)
- HTTP test files in `tests/http/` (manual testing)
- Docker configuration files
- Shell scripts for setup/deployment

These are development/documentation tools and don't need the strict validation.

## Related Documentation

- `QUICK-START.md` - Setup instructions
- `SECURITY-CHECKLIST.md` - Production security checklist
- `.kiro/steering/tech.md` - Tech stack documentation
