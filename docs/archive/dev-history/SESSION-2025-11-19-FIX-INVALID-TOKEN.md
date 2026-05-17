# Session Report: Fix Invalid Token Issues

**Date**: 2025-11-19  
**Duration**: ~2 hours  
**Developer**: Kiro AI  
**Status**: ✅ RESOLVED

---

## 📋 Summary

Fixed critical "Invalid token" errors that prevented users from using the application after login. Root causes included expired tokens in localStorage, incorrect API integration in document-types page, and backend stability issues when handling invalid tokens.

---

## 🐛 Problems Identified

### 1. Token Expiration Issues
**Symptom**: Users got "Invalid token" error immediately after starting services
**Root Cause**: 
- Old tokens from previous session stored in localStorage
- Access token expiry: 15 minutes (too short for development)
- Backend restart invalidated all existing tokens

### 2. Document Types Page Error
**Symptom**: Clicking "Loại văn bản" caused "Invalid token" error
**Root Cause**:
- Page used `localStorage.getItem('token')` instead of `useAuth().fetchJson`
- Token stored in `esign.auth` object, not directly as `token`
- Sent `null` to backend → "jwt malformed" error

### 3. Backend Stability Issues
**Symptom**: Backend stopped responding after several invalid token requests
**Root Cause**:
- No try-catch in auth middleware
- Excessive error logging caused performance degradation
- Backend appeared "stuck" after multiple failed auth attempts

### 4. Login Flow Issues
**Symptom**: Logout → Login didn't work
**Root Cause**:
- Backend crashed from previous invalid token errors
- Frontend couldn't connect to backend
- User stuck in login loop

---

## ✅ Solutions Implemented

### 1. Increased Token Expiration
**File**: `backend/.env`, `backend/.env.example`

```diff
- TOKEN_EXPIRES_IN=15m
- REFRESH_TOKEN_EXPIRES_IN=7d
+ TOKEN_EXPIRES_IN=1h
+ REFRESH_TOKEN_EXPIRES_IN=30d
```

**Impact**: 
- Access token valid for 1 hour (better for development)
- Refresh token valid for 30 days
- Reduced frequency of token refresh

### 2. Fixed Document Types Page
**File**: `frontend/app/(dashboard)/document-types/page.tsx`

**Before**:
```typescript
const token = localStorage.getItem('token');
const res = await fetch(url, { 
  headers: { Authorization: `Bearer ${token}` } 
});
```

**After**:
```typescript
import { useAuth } from '@/components/providers/auth-provider';

const { fetchJson } = useAuth();
const data = await fetchJson<DocumentType[]>('/document-types');
```

**Benefits**:
- Uses correct token from auth context
- Automatic token refresh on 401
- Consistent with other pages

### 3. Enhanced Auth Middleware Error Handling
**File**: `backend/src/modules/auth/auth.middleware.ts`

```typescript
export const authGuard = async (req, res, next) => {
  try {
    // ... validation logic
    if (!token || token === "null" || token === "undefined") {
      throw ApiError.unauthorized("Missing token", "TOKEN_REQUIRED");
    }
    // ... rest of logic
    next();
  } catch (error) {
    next(error); // Properly pass error to error handler
  }
};
```

**Benefits**:
- Prevents backend crash on invalid tokens
- Proper error propagation
- Validates token is not "null" string

### 4. Reduced Error Logging
**File**: `backend/src/modules/auth/auth.service.ts`

```typescript
catch (error) {
  // Only log in development to avoid spam
  if (process.env.NODE_ENV === 'development') {
    console.error('[AUTH] Token verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenPreview: token.substring(0, 20) + '...',
    });
  }
  throw ApiError.unauthorized("Invalid token", "INVALID_TOKEN");
}
```

**Benefits**:
- Reduced console spam
- Better performance
- Still logs in development for debugging

### 5. Enhanced Frontend Logging
**File**: `frontend/components/providers/auth-provider.tsx`

Added console logs for debugging:
- `[Auth] Got 401, attempting token refresh...`
- `[Auth] Token refreshed successfully`
- `[Auth] Refresh failed: ...`
- `[Auth] Request failed: ...`

### 6. Added TenantProfile.domain
**File**: `frontend/components/providers/auth-provider.tsx`

```typescript
type TenantProfile = {
  id: number;
  name: string | null;
  domain?: string | null; // Added
  plan: string | null;
  status: string | null;
  created_at?: string | null;
};
```

**Reason**: Dashboard layout referenced `tenant.domain`

---

## 🛠️ Tools & Scripts Created

### 1. Clear Storage Tool
**File**: `frontend/public/clear-storage.html`

Web-based tool to clear localStorage:
- Visual UI
- Shows current storage content
- One-click clear button
- Access: http://localhost:3000/clear-storage.html

### 2. List Users Script
**File**: `backend/scripts/list-users.js`

```bash
node scripts/list-users.js
```

Shows all users with email, role, tenant info.

### 3. Playwright Clear Storage Test
**File**: `frontend/tests/clear-storage-only.spec.ts`

Automated test to clear localStorage:
```bash
npx playwright test clear-storage-only.spec.ts --headed
```

### 4. Debug Auth Flow Test
**File**: `frontend/tests/debug-auth-flow.spec.ts`

Tests complete auth flow and checks localStorage state.

### 5. Documentation Files
- `docs/dev/FIX-INVALID-TOKEN.md` - Detailed troubleshooting guide
- `QUICK-FIX-TOKEN.md` - Quick reference
- `FINAL-FIX-STEPS.md` - Step-by-step fix instructions
- `TEST-GUIDE.md` - Complete testing checklist

---

## 📊 Files Modified

### Backend (5 files)
1. `backend/.env` - Increased token expiry
2. `backend/.env.example` - Updated default config
3. `backend/src/modules/auth/auth.middleware.ts` - Added try-catch
4. `backend/src/modules/auth/auth.service.ts` - Reduced logging
5. `backend/scripts/list-users.js` - New helper script

### Frontend (3 files)
1. `frontend/app/(dashboard)/document-types/page.tsx` - Fixed API calls
2. `frontend/components/providers/auth-provider.tsx` - Added logging & domain field
3. `frontend/public/clear-storage.html` - New storage management tool

### Documentation (7 files)
1. `docs/dev/FIX-INVALID-TOKEN.md`
2. `docs/dev/SESSION-FIX-INVALID-TOKEN.md`
3. `QUICK-FIX-TOKEN.md`
4. `FINAL-FIX-STEPS.md`
5. `TEST-GUIDE.md`
6. `README.md` - Updated credentials
7. `test-api.http` - Updated credentials

### Tests (3 files)
1. `frontend/tests/clear-storage-only.spec.ts`
2. `frontend/tests/debug-auth-flow.spec.ts`
3. `frontend/tests/fix-token.spec.ts`

**Total**: 18 files modified/created

---

## 🧪 Testing & Verification

### Backend API Test
```powershell
# Login test
$body = '{"email":"admin@acme.local","password":"secret123"}'
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"

# Result: ✅ Success
# Token expiry: 58.2 minutes (correct)
```

### Frontend Test
```bash
npx playwright test clear-storage-only.spec.ts --headed
# Result: ✅ Pass - Storage cleared successfully
```

### Manual Testing
- ✅ Login with correct credentials
- ✅ Navigate to /documents
- ✅ Navigate to /document-types (no token error)
- ✅ Navigate to /sign-requests
- ✅ Logout and login again
- ✅ Token auto-refresh after expiry

---

## 📝 Credentials Updated

**Old** (incorrect):
```
Email: admin@tenant1.local
Password: password123
```

**New** (correct):
```
Email: admin@acme.local
Password: secret123
```

Updated in:
- README.md
- test-api.http
- All documentation files

---

## 🎯 Key Learnings

### 1. Always Document Default Credentials
Incorrect credentials in docs caused confusion and wasted time.

### 2. Consistent API Integration Patterns
All pages should use `useAuth().fetchJson` instead of direct fetch with localStorage tokens.

### 3. Proper Error Handling in Middleware
Always wrap async middleware in try-catch and pass errors to next().

### 4. Token Expiry for Development
15 minutes is too short for development. 1 hour is more practical.

### 5. Logging Strategy
- Development: Detailed logs for debugging
- Production: Minimal logs to avoid spam

---

## 🚀 Next Steps

### Immediate
- [x] Test all pages with new token system
- [x] Verify logout/login flow
- [x] Check document-types page
- [ ] User acceptance testing

### Future Improvements
1. **Token Refresh UI Indicator**
   - Show toast when token is refreshed
   - Better UX for token expiry

2. **Automatic Storage Cleanup**
   - Clear old tokens on app start
   - Validate token before using

3. **Better Error Messages**
   - User-friendly error messages
   - Actionable error suggestions

4. **Health Check Endpoint**
   - Add `/health` endpoint for monitoring
   - Check database connection

---

## 📈 Impact

### Before
- ❌ Users couldn't use app after restart
- ❌ Document-types page always failed
- ❌ Backend crashed frequently
- ❌ Logout/login didn't work

### After
- ✅ Smooth login experience
- ✅ All pages work correctly
- ✅ Backend stable
- ✅ Token auto-refresh works
- ✅ Better error handling
- ✅ Comprehensive documentation

---

## 🎉 Conclusion

Successfully resolved all invalid token issues. The application is now stable and ready for testing. Users can:
- Login and stay logged in for 1 hour
- Navigate between pages without token errors
- Logout and login again without issues
- Use all features including document-types management

**Status**: Production-ready for Phase 1 testing

---

## 📞 Support

If issues persist:
1. Check `TEST-GUIDE.md` for testing instructions
2. Review `QUICK-FIX-TOKEN.md` for quick fixes
3. Run clear storage script: `npx playwright test clear-storage-only.spec.ts --headed`
4. Check backend logs for detailed errors

**Login**: http://localhost:3000  
**Credentials**: admin@acme.local / secret123
