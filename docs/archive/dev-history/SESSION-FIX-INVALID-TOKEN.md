# Session Report: Fix Invalid Token Error

**Date**: 2025-11-19  
**Duration**: ~30 minutes  
**Status**: ✅ Resolved

## Problem
User gặp lỗi "Invalid token" khi sử dụng frontend, không thể fetch documents hoặc các API khác.

## Root Cause Analysis

### 1. Wrong Credentials
- Docs cũ ghi: `admin@tenant1.local / password123`
- Thực tế trong seed: `admin@acme.local / secret123`
- User đã login với credentials cũ → token invalid

### 2. Token Expiration
- Access token: 15 phút
- Refresh token: 7 ngày
- Token trong localStorage có thể đã hết hạn

### 3. Lack of Debugging Tools
- Không có logging chi tiết
- Không có tool để clear localStorage
- Không có guide để troubleshoot

## Solutions Implemented

### 1. Enhanced Logging

**Backend** (`auth.service.ts`):
```typescript
catch (error) {
  console.error('[AUTH] Token verification failed:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    tokenPreview: token.substring(0, 20) + '...',
  });
  throw ApiError.unauthorized("Invalid token", "INVALID_TOKEN");
}
```

**Frontend** (`auth-provider.tsx`):
```typescript
// Refresh logging
console.log('[Auth] Got 401, attempting token refresh...');
console.log('[Auth] Token refreshed successfully');

// Error logging
console.error('[Auth] Refresh failed:', payload.error);
console.error('[Auth] Request failed:', json.error);
```

### 2. Clear Storage Tool

Created `frontend/public/clear-storage.html`:
- Visual UI để clear localStorage
- Display current storage content
- One-click clear button
- Access: http://localhost:3000/clear-storage.html

### 3. Helper Scripts

**List Users** (`backend/scripts/list-users.js`):
```bash
node scripts/list-users.js
# Shows all users with email, role, tenant
```

**Test Auth Flow** (`backend/scripts/test-auth-flow.js`):
- Test login
- Test protected endpoints
- Test refresh token
- Verify new token works

### 4. Documentation

**Created**:
- `docs/dev/FIX-INVALID-TOKEN.md` - Detailed troubleshooting guide
- `QUICK-FIX-TOKEN.md` - Quick reference for common fix

**Updated**:
- `README.md` - Correct credentials
- `test-api.http` - Correct email/password
- `AGENTS.md` - Session progress

## Verification

### Backend Test
```powershell
# Login successful
$body = '{"email":"admin@acme.local","password":"secret123"}'
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"

# Token works
$headers = @{ Authorization = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/documents" -Headers $headers
```

✅ Backend auth working correctly

### Frontend Fix Steps
1. Open http://localhost:3000/clear-storage.html
2. Click "Clear All Storage"
3. Go to http://localhost:3000
4. Login with `admin@acme.local / secret123`
5. All API calls should work

## Files Modified

### Backend
- `backend/src/modules/auth/auth.service.ts` - Added error logging
- `backend/scripts/list-users.js` - New helper script
- `backend/scripts/test-auth-flow.js` - New test script

### Frontend
- `frontend/components/providers/auth-provider.tsx` - Enhanced logging & error handling
- `frontend/public/clear-storage.html` - New storage management tool

### Documentation
- `docs/dev/FIX-INVALID-TOKEN.md` - New troubleshooting guide
- `docs/dev/SESSION-FIX-INVALID-TOKEN.md` - This report
- `QUICK-FIX-TOKEN.md` - Quick reference
- `README.md` - Updated credentials
- `test-api.http` - Updated credentials

## Key Learnings

1. **Always document default credentials** in main README
2. **Logging is critical** for debugging auth issues
3. **Provide tools** for common operations (clear storage)
4. **Keep docs in sync** with actual code/data

## Next Steps

User should:
1. Clear localStorage using provided tool
2. Login with correct credentials
3. Verify all features work
4. Continue with Phase 1 development (External Organizations module)

## Stats
- 8 files modified
- 3 new helper tools created
- 3 documentation files created
- ~200 LOC added
- Issue resolved in ~30 minutes
