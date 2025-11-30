# SPEC-1: Redis Caching Implementation

## 📋 Overview
Implement Redis caching layer to reduce database load and improve performance for frequently accessed data.

**Priority**: HIGH  
**Estimated Time**: 2-3 days  
**Impact**: -70% database queries, 3-5x faster response time

---

## 🎯 Goals
- Reduce database load for permission checks
- Cache user-role-department relationships
- Cache workflow templates
- Improve API response time from ~500ms to ~100ms

---

## 📝 Task Breakdown

### Task 1.1: Setup Redis Cache Service (4 hours)

**File**: `backend/src/services/cache.service.ts`

```typescript
import { redis } from '../config/redis';

interface CacheOptions {
  ttl?: number; // seconds, default 3600 (1 hour)
}

class CacheService {
  private defaultTTL = 3600; // 1 hour

  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || this.defaultTTL;
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

export const cacheService = new CacheService();
```

**Acceptance Criteria**:
- ✅ CacheService implemented with get/set/del methods
- ✅ TTL support (default 1 hour)
- ✅ Pattern-based deletion for cache invalidation
- ✅ Unit tests written (80% coverage)

---

### Task 1.2: Cache Permission Checks (6 hours)

**File**: `backend/src/modules/roles/roles.service.ts`

**Changes**:
1. Import cache service
2. Check cache before DB query
3. Cache results after DB query
4. Invalidate cache on role/permission changes

**Example**:
```typescript
async getUserPermissions(userId: number) {
  const cacheKey = cacheService.generateKey('user:permissions', userId);
  
  const cached = await cacheService.get<string[]>(cacheKey);
  if (cached) return cached;
  
  // Query DB (existing code)
  const permissions = await this.queryPermissions(userId);
  
  await cacheService.set(cacheKey, permissions, { ttl: 3600 });
  return permissions;
}
```

**Acceptance Criteria**:
- ✅ Permission checks use cache
- ✅ Cache invalidation on role/permission changes
- ✅ Performance: <10ms for cached requests
- ✅ Integration tests written

---

### Task 1.3: Cache User Data (4 hours)

**File**: `backend/src/modules/users/users.service.ts`

**Cache Keys**:
- `user:full:{tenantId}:{userId}` - User with all relations
- `user:permissions:{userId}` - User permissions

**TTL**: 30 minutes (1800 seconds)

**Invalidation Triggers**:
- User update/delete
- Role assignment change
- Department change

---

### Task 1.4: Cache Workflow Templates (3 hours)

**File**: `backend/src/modules/workflows/workflows.service.ts`

**Cache Keys**:
- `workflow:{tenantId}:{workflowId}` - Full workflow with steps
- `workflows:list:{tenantId}` - All workflows for tenant

**TTL**: 1 hour (3600 seconds)

---

### Task 1.5: Cache Document Types (2 hours)

**File**: `backend/src/modules/documentTypes/documentTypes.service.ts`

**Cache Keys**:
- `document-types:{tenantId}` - All document types
- `document-type:{tenantId}:{typeId}` - Single type

**TTL**: 2 hours (7200 seconds)

---

## 🧪 Testing Plan

### Unit Tests
- Cache service methods
- Cache key generation
- TTL handling

### Integration Tests
- End-to-end caching flow
- Cache invalidation
- Cache hit/miss scenarios

### Performance Tests
- Measure response time before/after
- Cache hit rate monitoring
- Redis memory usage

---

## 📊 Success Metrics

- **Database Load**: -70%
- **API Response Time**: 500ms → 100ms (cached)
- **Cache Hit Rate**: >80%
- **Redis Memory Usage**: <500MB for 10k users

---

## 🚀 Deployment Checklist

- [ ] Redis server configured and running
- [ ] Cache service deployed
- [ ] Monitoring enabled
- [ ] Cache warming script (optional)
- [ ] Documentation updated
